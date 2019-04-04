+++
title = "Running VSCode in Docker"
date = 2019-04-04T02:13:50Z
author = "Binal Patel"
tags = ["docker", "ml engineering"]
categories = ["coding"]
+++

In my previous post I went through an example that involved in part running JupyterLab within Docker. This allowed us to directly develop within the container, which makes deploying and productionalizing that much easier since we don't have to worry about developing against one environment while deploying against a different one.

That being said Jupyter Lab isn't the most ideal development environment. It's great for prototyping via Jupyter notebooks, but it's lacking as a full IDE. My go to nowadays is Microsoft's VSCode, and as I learned recently you can actually run it directly within Docker due to the [Coder](https://coder.com/) team's great work.

Here's how I set it up - as before my focus was on setting up a data science environment where I could quickly iterate within the container itself.

#### TLDR

You can find a fully working example here:

https://github.com/caesarnine/data-science-docker-vscode-template


#### The Details

First - the `Dockerfile`. Here we're setting up our Conda environment, downloading the VScode binary, adding in a `code` folder and a `docker-entrypoint.sh` script. If you've never encountered an entrypoint script before - it essentially is telling Docker that this specific piece of code must always execute when the container starts.

`Dockerfile`:
```docker
 # the base miniconda3 image
 FROM continuumio/miniconda3:latest
 
 # load in the environment.yml file - this file controls what Python packages we install
 ADD environment.yml /
 
 # install the Python packages we specified into the base environment
 RUN conda update -n base conda -y && conda env update
 
 # download the coder binary, untar it, and allow it to be executed
 RUN wget https://github.com/codercom/code-server/releases/download/1.408-vsc1.32.0/code-server1.408-vsc1.32.0-linux-x64.tar.gz \
     && tar -xzvf code-server1.408-vsc1.32.0-linux-x64.tar.gz && chmod +x code-server1.408-vsc1.32.0-linux-x64/code-server
 
 # add in the code folder
 ADD ./code/ /code
 
 COPY docker-entrypoint.sh /usr/local/bin/
 
 ENTRYPOINT ["docker-entrypoint.sh"]
 ```

This is our `docker-entrypoint.sh` script. In summary: if no extra parameters are passed then we start JupyterLab and VSCode, if a parameter is passed than execute that instead. This allows us to do things like develop locally, and when we have a Python script ready just pass in `python our_script.py` without changing anything else.

`docker-entrypoint.sh`:
```docker
#!/bin/bash
set -e

if [ $# -eq 0 ]
  then
    jupyter lab --ip=0.0.0.0 --NotebookApp.token='local-development' --allow-root --no-browser &> /dev/null &
    code-server1.408-vsc1.32.0-linux-x64/code-server --allow-http --no-auth --data-dir /data /code
  else
    exec "$@"
fi
```

After we build the image (`docker build -t example-ds-project .`) we can run it. The following command runs our container, opening up ports 8443 and 8888, and mounts local directories `code` and `data` onto the container as well.

```
docker run -p 8443:8443 -p 8888:8888 -v $(pwd)/data:/data -v $(pwd)/code:/code --rm -it example-ds-project
```

We can then navigate to http://localhost:8443 and we have a fully featured, working version of VSCode:

![VSCode](/img/vscode.png)

You can even do things like installing extensions. For example you could install Microsoft's Python extension to enable things like autocomplete and formatting, and so on. All your extensions and VSCode configuration will persist in the local `./data` directory, so when you start up the container again you won't have to set everything up again.

As a plus we still have JupyterLab running on http://localhost:8888, which allows us still prototype quickly via notebooks, while being able to quickly switch over to VSCode when we're ready to clean up and productionalize our code.