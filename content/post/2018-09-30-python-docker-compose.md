+++
title = "Data Science with Docker and Conda"
date = 2018-10-07T02:13:50Z
author = "Binal Patel"
tags = ["python","docker","ml engineering"]
categories = ["coding"]
+++

I was hired as a data scientist at an early stage startup and soon after I was tasked with helping productionalize and deploy models as we ramped up more and more clients. The first few deploys were rushed, but easy - just setup the root environment with all the dependencies, and have a simple bash script call the code on a schedule.

Then as time went on things started to get messy. We started adding more data scientists, who all developed in different ways. Some of our earliest models relied on certain versions of packages, whereas some of the latest models were reliant on completely different (and sometimes breaking version) changes of the same package. 

Our "production" server became incredibly fragile, one accidental update of a package version could (and did) take down multiple processes. We eventually figured out a home-grown solution that worked out, but that experience was painful enough that I took the time to figure out a good, reproducible way to deal with environments and deployments in subsequent roles.

#### The Final Product

The final product will be a Docker Compose project that you can run in development mode and in production mode, switching easily between the two. 
    
1. Development mode will fire up a JupyterLab instance where you can prototype and test code
2. Production mode will run a productionalized Python script
3. Environment variables control whether we're hitting development or production systems

Additionally - once we're ready for production we'll have a Docker image that's easily deployable via a variety of different methods.

You can find the complete project here:

https://github.com/caesarnine/data-science-docker-template

Before we dig in - here's a quick rundown of the different components we'll rely on heavily.

##### Docker

From [Docker](https://www.docker.com/resources/what-container):

> A Docker container image is a lightweight, standalone, executable package of software that includes everything needed to run an application: code, runtime, system tools, system libraries and settings.

Essentially - docker containers let us bundle together everything we need for a project down to the operating system, and more so once we have a docker image we can guarantee that it'll run exactly as we expect in another server/environment.

##### Docker Compose

From [Docker](https://docs.docker.com/compose/overview/):

> Compose is a tool for defining and running multi-container Docker applications. With Compose, you use a YAML file to configure your application’s services. Then, with a single command, you create and start all the services from your configuration. To learn more about all the features of Compose, see the list of features.

Docker Compose allows us orchestrate and define how our containers run - allowing us to use configuration to define things like what ports should be mapped, what commmands should be run on startup, and more.

##### Conda

From [Conda](https://conda.io/docs/):

> Conda is an open source package management system and environment management system that runs on Windows, macOS and Linux. Conda quickly installs, runs and updates packages and their dependencies. Conda easily creates, saves, loads and switches between environments on your local computer. It was created for Python programs, but it can package and distribute software for any language.

> Conda as a package manager helps you find and install packages. If you need a package that requires a different version of Python, you do not need to switch to a different environment manager, because conda is also an environment manager. With just a few commands, you can set up a totally separate environment to run that different version of Python, while continuing to run your usual version of Python in your normal environment.

Conda handles dependency management for you. Say you want to install version 0.20 of Scikit-Learn, Conda can find *everything* that specific version needs (both Python and system dependencies), and installs everything for you. More so - you easily define what package versions you want as configuration, allowing you to recreate your Python environment exactly.

#### Combining Them Together

The core of this all will be our Dockerfile - it's the configuration that tells Docker how to build our container. We're going to take advantage of a prebuilt image that Anaconda provides to get started. The `environment.yml` defines what Python packages we want to install, the and last command simply tells conda to update itself, then install everything we defined.

We'll have two different versions, with the production version having two additional commands to package directories into the docker image as well.

`Dockerfile-dev`:
```docker
# base image
FROM continuumio/miniconda3:4.5.11

# load in the environment.yml file
ADD environment.yml /

# create the environment
RUN conda update -n base conda -y && conda env update
```

`Dockerfile-prod`:
```docker
# base image
FROM continuumio/miniconda3:4.5.11

# load in the environment.yml file
ADD ./docker/environment.yml /

# create the environment
RUN conda update -n base conda -y && conda env update

# add the code folder and notebooks folder to the docker image - this allows us to run
# the image directly without relying on docker-compose or local file dependenciess
ADD ./code/ /code
ADD ./notebooks /notebooks
```

Here's an example `environment.yml` - in it we tell conda to install explicit versions of everything except JupyterLab.

`environment.yml`:
```yaml
name: base                                                                   
channels:                                                                    
  - defaults                                                                 
dependencies:                                                                
  - pandas=0.22.0
  - sqlalchemy=1.2.1
  - scikit-learn=0.20.0
  - pyodbc=4.0.23
  - jupyterlab
```

To make running things easier, instead of always typing out what ports to map, what volumes to mount, and what command to run evey single time as a `docker run` command, we'll instead use `docker-compose`.

We'll first create a folder structure similar to this:

```
my_project
│   docker-compose.yml
│   docker-compose.prod.yml
|   .env
│
└───code
│   │   
│   └───.. (this will contain all our Python scripts/model assets)
│
└───data
│   │   
│   └───.. (this will contain any external data we rely on (or are testing with))
│
└───notebooks
│   │   
│   └───.. (this will contain all our Jupyter notebooks during prototyping)
│ 
└───docker
    │  
    └───Dockerfile
    └───environment.yml

```

This will be our `docker-compose.yml` file. It's our "sane default". At worst all that'll happen from accidentally running ```docker-compose up``` is that JuypterLab will start up. (As opposed to a script starting up that hits production systems). In practice I also sometimes end up adding in other containers, such a database container that allows for quick iteration without having to hit external systems.

`docker-compose.yml`:
```docker-compose
version: "3.2"

services:
  python:       
    build: 
      dockerfile: ./docker/Dockerfile-dev
      context: ./
    image: my_project_python
    env_file:
      - .env_dev

    ports:
      - "8888:8888"

    command: 
      jupyter lab --no-browser --ip=0.0.0.0 --allow-root --NotebookApp.token='local_dev'

    volumes:
      - ./data:/data
      - ./code:/code
      - ./notebooks:/notebooks
```

Our `docker-compose.prod.yml` file will be similar, with the exception of the ports and the command. You'll notice that it doesn't mount the local `./code` and `./notebooks` folders anymore (since they'll be packaged into the image).

`docker-compose.prod.yml`:
```docker-compose
version: "3.2"

services:
  python:       
    build: 
      dockerfile: ./docker/Dockerfile-prod
      context: ./
    image: my_project_python # replace with "registry/image" if pushing to a docker registry
    env_file:
      - .env_prod

    command: 
      python /code/example.py

    # note - once in production I usually pull from an API or some other location, if you
    # still expect to pull data from the file system then uncomment the below two lines and
    # replace /real_data_location with the correct path
    #volumes:
    #  - /real_data_location:/data

```

And last - our `.env` files will contain variables that we want available within the container at runtime. We'll populate `.env_dev` with development variables, and `.env_prod` with production variables.

`.env_dev`:
```bash
# credentials and database information
db_username=username
db_password=password
db_host=host
db_port=1433
db_name=test

# random seed for reproducible models
random_seed=42
```

Within our Python scripts we can then simply access these variables via `os.environ.get('variable_name')`. This allows us to store sensitive data, without having it hardcoded within our scripts, nor storing it within our repository. More so - we don't have to change our code to change the environments we run in, we just have to change what docker-compose file we run with.

**Make sure to add .env* to your `.gitignore` file, otherwise you may accidently commit it to Git.**

#### How to Use This All

As an example - here's my normal development process. Using it I can get from development to production with little friction, knowing that my code will work as expected, and that it won't negatively affect other processes on the production server.

##### Developing and Packaging

1. Clone the template down. Update the `environment.yml` as needed with packages I know I'll need, and run `docker-compose build`. This will build the development image with all the packages I defined installed within it.
2. Create a `.env_dev` file with development environment variables, and a `.env_prod` with production environment variables.
3. Run `docker-compose up` and navigate to JupyterLab, which will be running on [http://localhost:8888](http://localhost:8888). We can access it by entering in the token `local_dev`.
4. From there prototype and develop a model/process using Jupyter Notebooks, saving any notebooks I create along the way into `/notebooks` as a development diary. Any final artifacts/models I plan on using in production I save within `/code`.
5. Once I have a final version of my code, save it (and any models it relies on) into `/code`.
6. Update the `docker-compose.prod.yml` file's `command` section to point to the my scripts' name, and the `image` section to point to my docker registry (something like my_registry/my_project:0.1).
7. Run `docker-compose -f docker-compose.prod.yml build` - this builds the production version of the image, packaging everything in the `/code` and `/notebooks` directories directly onto the image.
8. Run `docker-compose push` which pushes that packaged image into my organizations docker registry.

At this point I now have an image that contains all my code, models, and other artifacts I need, that's preinstalled with exact versions of the Python packages and dependencies I require. It's stored in a central location where I can easily pull it down onto other servers.

##### Deploying

Within production we have multiple options.

1. We could simply copy the entire project over as is, run `docker-compose -f docker-compose.prod.yml pull` to pull down the image, and schedule it in crontab. Make sure to create a `.env_prod` file in the same location with the environment variables you need. 
(If you didn't use a docker registry, then just run `docker-compose -f docker-compose.prod.yml build` first before scheduling it.)

    The crontab command would look something like this:
    
        0 22 * * * docker-compose -f /path/to/project/docker-compose.prod.yml up


2. Alternatively we could run the image directly and pass in the environment variables via the command line or read them in from a central environment file.

        0 22 * * * docker run my_project_name python /code/my_script.py --env_file /env/.env_prod

3. We could do the same thing in AirFlow as well - using the [Docker Operator](https://airflow.apache.org/code.html?highlight=docker#airflow.operators.docker_operator.DockerOperator) or the [Bash Operator](https://airflow.apache.org/code.html?highlight=docker#airflow.operators.bash_operator.BashOperator) to run the image on some schedule, passing in the environment variables from Airflow's central variable store.

4. The last option - and the one I'll explore further in an upcoming post - is using [MLflow](https://mlflow.org/) to extend the above framework to both track modelling iterations, and to serve the model as as a long-running REST API that we can call to make new predictions.