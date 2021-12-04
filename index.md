---
title: 🧠 Index 🧠
slug: index
feed:
  count: 1000
date: 2021-05-22
---

# Hi! <img src="https://user-images.githubusercontent.com/1303154/88677602-1635ba80-d120-11ea-84d8-d263ba5fc3c0.gif" width="28px" alt="hi"> I'm Mark.

``` {=html}
<!-- DAG -->
<script src="//unpkg.com/d3-dsv"></script>
<script src="//unpkg.com/dat.gui"></script>
<script src="//unpkg.com/d3-octree"></script>
<script src="//unpkg.com/d3-force-3d"></script>

<!-- Essentials -->
<script src="//unpkg.com/three"></script>
<script src="//unpkg.com/element-resize-detector/dist/element-resize-detector.min.js"></script>
<script src="//unpkg.com/3d-force-graph"></script>

<!-- Node renderer -->
<script src="//unpkg.com/three-spritetext"></script>
<script src="//unpkg.com/three/examples/js/renderers/CSS2DRenderer.js"></script>

<!-- Styles -->
<link rel="stylesheet" href="./static/css/3d-graph.css">

<div id="graph-visibility-controls" class="graph-controls">
  <button id="visibilityToggle">
    Hide Graph
  </button>
</div>

<div id="3d-graph-container">
  <div id="graph-behavior-controls" class="graph-controls">
    <button id="geometryToggle">
      Text-Node Mode
    </button>
    <button id="animationToggle">
      Pause Animation
    </button>
    <button id="rotationToggle">
      Resume Rotation
    </button>
  </div>
  <div id="dat-gui"></div>
  <div id="3d-graph"></div>

  <blockquote id="graph-instructions">
    Drag to rellocate a node. Click to focus on node (while rotation is paused).
    Double click a node to view its Zettel page. Double click background to
    zoom-to-fit. Nodes are colored and sized based on clustering. Nodes that has
    more subnodes will be displayed relatively bigger.
  </blockquote>
</div>

<script src="./static/js/3d-graph.js" type="module"></script>
```

Made with [3D Force-Directed Graph](https://github.com/vasturiano/3d-force-graph)

[![GitHub followers](https://img.shields.io/github/followers/marklcrns.svg?style=social&label=Follow&maxAge=2592000)](https://github.com/marklcrns?tab=followers)

Welcome! To my personal [[a10a5041|Zettlekasten]] inspired by Niklas Luhmann,
powered by [neuron](https://github.com/srid/neuron).

## Recent Posts

<!-- NOTE: Forward folge # is essential for RSS -->
[[z:zettels?tag=zettel&limit=10&timeline]]#

[[zettel|See more]]

## Book Notes

[[z:zettels?tag=book&limit=5&timeline]]

[[book|See more]]

## Topics

### Computer Programming

[[z:zettels?tag=programming&limit=5&timeline]]

[[programming|See more]]

### Science

[[z:zettels?tag=science&limit=5&timeline]]

[[science|See more]]

### Psychology

[[z:zettels?tag=psychology&limit=5&timeline]]

[[psychology|See more]]

### History

[[z:zettels?tag=history&limit=5&timeline]]

[[history|See more]]


{.ui .horizontal .divider}
<section id="subscriptionLinks"></section>
