---
title: Index
feed:
  count: 5
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
<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>

<!-- Node renderer -->
<!-- <script src="//unpkg.com/three-spritetext"></script> -->
<script src="//unpkg.com/three/examples/js/renderers/CSS2DRenderer.js"></script>

<!-- Styles -->
<link rel="stylesheet" href="./static/3d-graph.css">

<div id="3d-graph" style='visibility:hidden; text-align: center;'></div>
<div style="position: relative; display: flex; align-items: center; justify-content: center; padding: 5px;">
  <button id="animationToggle" style="margin: 8px; height: 25px; width: 150px;">
    Pause Animation
  </button>
  <button id="rotationToggle" style="margin: 8px; height: 25px; width: 150px;">
    Resume Rotation
  </button>
</div>

<script src="./static/3d-graph.js" type="module"></script>
```

> Drag to rellocate a node. Click to focus on node (while rotation is paused).
> Double click a node to view its Zettel page. Double click background to
> zoom-to-fit. Nodes are colored and sized based on clustering. Nodes that has
> more subnodes will be displayed relatively bigger.

Made with [3D Force-Directed Graph](https://github.com/vasturiano/3d-force-graph)

<!-- ``` {=html}                                             -->
<!-- <script src="https://d3js.org/d3.v6.min.js"></script>   -->
<!-- <link rel="stylesheet" href="./static/graph.css">       -->
<!-- <script src="./static/graph.js" type="module"></script> -->
<!-- ```                                                     -->

<!-- > Drag to pin a node. Ctrl + Click to unpin a node. Double click node to view -->
<!-- > note. Nodes are colored and sized based on incoming degree, so notes more   -->
<!-- > heavily linked to will grow in relative size.                               -->

[![GitHub followers](https://img.shields.io/github/followers/marklcrns.svg?style=social&label=Follow&maxAge=2592000)](https://github.com/marklcrns?tab=followers)

Welcome! to my personal
[Zettlekasten](https://en.wikipedia.org/wiki/Zettelkasten) inspired by Niklas
Luhmann, powered by [neuron](https://github.com/srid/neuron).

Check out the [Impulse](/impulse.html) page for the list of all my zettels in.

<br>

<!-- _Credits goes to [Devon Morris](https://github.com/DevonMorris)'s           -->
<!-- [Zettelkasten](https://github.com/DevonMorris/zettelkasten) for his awesome -->
<!-- directed graph made with [D3.js](https://d3js.org/)_                        -->

## Recent Posts

[[z:zettels?tag=blog&limit=10&timeline]]#

## Topics

[[z:zettels?tag=science/**&grouped&timeline]]

[[z:zettels?tag=psychology/**&grouped&timeline]]

[[z:zettels?tag=programming/**&grouped&timeline]]

[[z:zettels?tag=history/**&grouped&timeline]]

## Book Notes

[[z:zettels?tag=book/*&grouped&timeline]]

{.ui .horizontal .divider}
<section id="subscriptionLinks"></section>
