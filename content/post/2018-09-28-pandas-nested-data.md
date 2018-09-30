+++
title = "Exploding/Flattening Nested Data in Pandas"
date = 2018-09-28T02:13:50Z
author = "Binal Patel"
tags = ["python","pandas"]
categories = ["coding"]
+++
In this post we will walk through how to deal with nested data using Pandas, exploding (or flattening) that data into a tabular format that's easier to dealt with and analyze.
<!--more-->
***
Import Modules
```python
import pandas as pd
import json
```

Create a Test Dataset

```python
age=[21,22,23]
nested_data=[
    '''{"occupation":"nurse", "interests":"movies"}''',
    '''{"occupation":"teacher", "favorite_food":"spaghetti"}''', 
    '''{"occupation":"doctor"}'''
]

data = pd.DataFrame(dict(age=age, nested_data=nested_data))
```


```python
data
```
<div>
<table class="table table-bordered table-sm table-hover">
  <thead>
    <tr style="text-align: right;">
      <th></th>
      <th>age</th>
      <th>nested_data</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>0</th>
      <td>21</td>
      <td>{"occupation":"nurse", "interests":"movies"}</td>
    </tr>
    <tr>
      <th>1</th>
      <td>22</td>
      <td>{"occupation":"teacher", "favorite_food":"spag...</td>
    </tr>
    <tr>
      <th>2</th>
      <td>23</td>
      <td>{"occupation":"doctor"}</td>
    </tr>
  </tbody>
</table>
</div>


Load the JSON string into a dictionary and then convert it into a Series object. This flattens out the dictionary into a table-like format. Notice how this creates a column per key, and that NaNs are intelligently filled in via Pandas.
```python
exploded = data.nested_data.apply(json.loads).apply(pd.Series)
exploded
```
<div>
<table class="table table-bordered table-sm table-hover">
  <thead>
    <tr style="text-align: right;">
      <th></th>
      <th>occupation</th>
      <th>interests</th>
      <th>favorite_food</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>0</th>
      <td>nurse</td>
      <td>movies</td>
      <td>NaN</td>
    </tr>
    <tr>
      <th>1</th>
      <td>teacher</td>
      <td>NaN</td>
      <td>spaghetti</td>
    </tr>
    <tr>
      <th>2</th>
      <td>doctor</td>
      <td>NaN</td>
      <td>NaN</td>
    </tr>
  </tbody>
</table>
</div>

Last - we'll drop the orignial nested column and concatenate the exploded version to create our final dataset.
```python
pd.concat([data.drop(columns='nested_data'), exploded], axis=1)
```
<div>
<table class="table table-bordered table-sm table-hover">
  <thead>
    <tr style="text-align: right;">
      <th></th>
      <th>age</th>
      <th>occupation</th>
      <th>interests</th>
      <th>favorite_food</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>0</th>
      <td>21</td>
      <td>nurse</td>
      <td>movies</td>
      <td>NaN</td>
    </tr>
    <tr>
      <th>1</th>
      <td>22</td>
      <td>teacher</td>
      <td>NaN</td>
      <td>spaghetti</td>
    </tr>
    <tr>
      <th>2</th>
      <td>23</td>
      <td>doctor</td>
      <td>NaN</td>
      <td>NaN</td>
    </tr>
  </tbody>
</table>
</div>
