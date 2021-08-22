// 3D Directed graph
// https://github.com/vasturiano/3d-force-graph

import { UnrealBloomPass } from '//cdn.skypack.dev/three/examples/jsm/postprocessing/UnrealBloomPass.js';

const excludedNodes = ["index", "README", "faq", "LICENSE"];

var graph = {};
$.getJSON('../cache.json', function(data) {
  console.log(data.Graph);
  var clusterCount = 0;
  var nodeMap = {};

  // Build nodes
  var nodes = [];
  Object.entries(data.Graph.vertices).forEach(([node,e]) => {
    if (!excludedNodes.includes(e.ID)) {
      var node = {}
      // Meta
      node.id = e.ID;
      node.name = e.Title;
      node.value = e.Slug;
      node.tags = e.Meta.tags;
      node.clusterid = 0;
      // For cross-linking
      node.neighbors = [];
      node.links = [];
      // Push to nodeMap for ref
      nodeMap[node.id] = nodes.length;

      nodes.push(node);
    }
  })

  // Build links
  var links = [];
  Object.entries(data.Graph.adjacencyMap).forEach(([source, entry]) => {
    if (!$.isEmptyObject(entry)) {
      Object.entries(entry).forEach((e) => {
        var target = e[0];
        var folgeType = e[1][0];

        if (!excludedNodes.includes(source) && !excludedNodes.includes(target)) {
          var link = {};
          if (folgeType === "folgeinv") {
            link.source = target;
            link.target = source;
          } else {
            link.source = source;
            link.target = target;
          }
          // Inherit clusterid from source node
          if (nodes[nodeMap[link.source]].clusterid === 0) {
            nodes[nodeMap[link.source]].clusterid = ++clusterCount;
          }
          nodes[nodeMap[link.target]].clusterid = nodes[nodeMap[link.source]].clusterid;

          links.push(link);
        }
      });
    }
  })
  graph.nodes = nodes;
  graph.links = links;

  // cross-link node objects
  graph.links.forEach(link => {
    const a = graph.nodes[nodeMap[link.source]];
    const b = graph.nodes[nodeMap[link.target]];
    a.neighbors.push(b);
    b.neighbors.push(a);
    a.links.push(link);
    b.links.push(link);
  });

  var camDistance = 600

  const highlightNodes = new Set();
  const highlightLinks = new Set();
  let hoverNode = null;

  var lastNodeClick = 0;
  var lastBackgroundClick = 0;
  const doubleClickDuration = 800;

  // const Graph = ForceGraph3D()
  //   (document.getElementById("3d-graph"))
  //   .graphData(graph)
  //
  // Graph
  // // Text-only nodes
  //   .nodeThreeObject((node) => {
  //     // const sprite = new SpriteText(node.name);
  //     // sprite.material.depthWrite = false; // make sprite background transparent
  //     // sprite.color = node.color;
  //     // sprite.textHeight = 8;
  //     // return sprite;
  //   })

  const Graph = ForceGraph3D({ extraRenderers: [new THREE.CSS2DRenderer()] })
    (document.getElementById("3d-graph"))
    .graphData(graph)

  // HTML-nodes
  Graph
    .nodeThreeObject((node) => {
      const nodeEl = document.createElement('div');
      nodeEl.textContent = node.name;
      nodeEl.style.color = node.color;
      nodeEl.className = 'node-label';
      return new THREE.CSS2DObject(nodeEl);
    })
    .nodeThreeObjectExtend(true)

  // Some Properties
  Graph
    .nodeAutoColorBy("clusterid")
    .height('600')
    .showNavInfo(true)
    .d3Force("charge")
    .strength(-graph.nodes.length * 2);


  // OnClick listeners
  Graph
    .onBackgroundClick(() => {
      var d = new Date();
      var t = d.getTime();
      if ((t - lastBackgroundClick) < doubleClickDuration) {    // double click
        Graph.zoomToFit(100)
      }
      lastBackgroundClick = t;
    })
    .onNodeClick(node => {
      var d = new Date();
      var t = d.getTime();
      if ((t - lastNodeClick) < doubleClickDuration) {    // double click
        window.open("../" + node.value + ".html");
      } else{                                           // single click
        // Aim at node from outside it
        camDistance = 150;
        const distRatio = 1 + camDistance/Math.hypot(node.x, node.y, node.z);

        Graph.cameraPosition(
          { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new position
          node, // lookAt ({ x, y, z })
          2500  // ms transition duration
        );
      }

      lastNodeClick = t;
    })
    .linkWidth(link => highlightLinks.has(link) ? 2 : 1)
    .linkDirectionalParticles(link => highlightLinks.has(link) ? 2 : 0)
    .linkDirectionalParticleWidth(2)
    .onNodeHover(node => {
      // no state change
      if ((!node && !highlightNodes.size) || (node && hoverNode === node)) return;

      highlightNodes.clear();
      highlightLinks.clear();
      if (node) {
        highlightNodes.add(node);
        node.neighbors.forEach(neighbor => highlightNodes.add(neighbor));
        node.links.forEach(link => highlightLinks.add(link));
      }

      hoverNode = node || null;

      updateHighlight();
    })
    .onLinkHover(link => {
      highlightNodes.clear();
      highlightLinks.clear();

      if (link) {
        highlightLinks.add(link);
        highlightNodes.add(link.source);
        highlightNodes.add(link.target);
      }

      updateHighlight();
    })
    ;

  function updateHighlight() {
    // trigger update of highlighted objects in scene
    Graph
      .nodeColor(Graph.nodeColor())
      .linkWidth(Graph.linkWidth())
      .linkDirectionalParticles(Graph.linkDirectionalParticles());
  }

  // Bloom Post-Processing effect
  const bloomPass = new UnrealBloomPass();
  bloomPass.strength = 3;
  bloomPass.radius = 1;
  bloomPass.threshold = 0.1;
  Graph.postProcessingComposer().addPass(bloomPass);

  // Auto resize canvas
  var erd = elementResizeDetectorMaker({
    strategy: "scroll",
  })
  erd.listenTo(
    document.getElementById('3d-graph'),
    el => {
      Graph.width(el.offsetWidth);
      // Graph.height(el.offsetWidth);
      el.style.visibility = "inherit";
      //if(el.offsetWidth != 0) {
        //    erd.uninstall(el);
        //}
    }
  );

  // // camera orbit
  // let angle = 0;
  // setInterval(() => {
  //   Graph.cameraPosition({
  //     x: camDistance * Math.sin(angle),
  //     z: camDistance * Math.cos(angle)
  //   });
  //   angle += Math.PI / 300;
  // }, 10);
})

