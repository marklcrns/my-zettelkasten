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
      node.date = new Date(e.Date).toDateString();
      node.tags = e.Meta.tags;
      node.clusterid = 0;
      node.size = 0;
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

          // Make source node bigger
          nodes[nodeMap[link.source]].size += 1;

          links.push(link);
        }
      });
    }
  })
  graph.nodes = nodes;
  graph.links = links;

  // Cross-link node objects
  graph.links.forEach(link => {
    const a = graph.nodes[nodeMap[link.source]];
    const b = graph.nodes[nodeMap[link.target]];
    a.neighbors.push(b);
    b.neighbors.push(a);
    a.links.push(link);
    b.links.push(link);
  });

  // // Random tree graph
  // const N = 1000;
  // graph = {
  //   nodes: [...Array(N).keys()].map(i => ({
  //     id: i,
  //     name: "Chesca",
  //     neighbors: [],
  //     links: [],
  //   })),
  //   links: [...Array(N).keys()]
  //   .filter(id => id)
  //   .map(id => ({
  //     source: id,
  //     target: Math.round(Math.random() * (id-1))
  //   }))
  // };
  // 
  // // Cross-link node objects
  // graph.links.forEach(link => {
  //   const a = graph.nodes[link.source];
  //   const b = graph.nodes[link.target];
  //   a.neighbors.push(b);
  //   b.neighbors.push(a);
  //   a.links.push(link);
  //   b.links.push(link);
  // });

  const onClickCamDistance = 150;
  const focusTransitionDuration = 2500;
  const doubleClickDuration = 500;
  const zoomToFitView = 100;
  // const forceStrength = -graph.nodes.length * 2;
  const forceStrength = -15;
  const bloomPassStrength = 2;
  const bloomPassRadius = 1;
  const bloomPassThreshold = 0.1;

  const highlightNodes = new Set();
  const highlightLinks = new Set();
  let hoverNode = null;

  var camDistance = 600
  var isCamRotationActive = false;
  var isAnimationActive = true;

  var lastNodeClick = 0;
  var lastBackgroundClick = 0;

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

  // controls
  const controls = { '3D Graph DAG': 'null'};
  const gui = new dat.GUI();
  gui.add(controls, '3D Graph DAG', ['td', 'bu', 'lr', 'rl', 'zout', 'zin', 'radialout', 'radialin', null])
    .onChange(orientation => Graph && Graph.dagMode(orientation));

  const NODE_REL_SIZE = 3;

  // Create graph
  const Graph = ForceGraph3D({ extraRenderers: [new THREE.CSS2DRenderer()] })
    (document.getElementById("3d-graph"))
    .graphData(graph);

  // HTML-nodes
  Graph
    .nodeThreeObject((node) => {
      const nodeEl = document.createElement('div');
      nodeEl.textContent = node.name;
      nodeEl.style.color = node.color;
      nodeEl.className = 'node-label';
      return new THREE.CSS2DObject(nodeEl);
    })
    .nodeThreeObjectExtend(true);

  // Some Properties
  Graph
    .nodeAutoColorBy("clusterid")
    .nodeLabel('date')
    .nodeVal('size')
    .linkColor(() => 'rgba(255,255,255,0.4)')
    .height('600')
    .showNavInfo(true)
    .d3Force("charge").strength(forceStrength);

  // DAG
  Graph
    .dagMode(null)
    .dagLevelDistance(50)
    .nodeRelSize(NODE_REL_SIZE)
    .backgroundColor('#101020')
    .d3Force('collision', d3.forceCollide(node => Math.cbrt(node.size) * NODE_REL_SIZE))
    .d3VelocityDecay(0.3);

  // OnClick listeners
  Graph
    .onBackgroundClick(() => {
      var d = new Date();
      var t = d.getTime();
      if ((t - lastBackgroundClick) < doubleClickDuration) {    // double click
        Graph.zoomToFit(zoomToFitView)
      }
      lastBackgroundClick = t;
    })
    .onNodeClick(node => {
      var d = new Date();
      var t = d.getTime();
      // Double click
      if ((t - lastNodeClick) < doubleClickDuration) {
        window.open("../" + node.value + ".html", "_blank").focus();
      // Single click
      } else{
        if (!isCamRotationActive) {
          // Aim at node from outside it
          camDistance = onClickCamDistance;
          const distRatio = 1 + camDistance/Math.hypot(node.x, node.y, node.z);

          Graph.cameraPosition(
            { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new position
            node, // lookAt ({ x, y, z })
            focusTransitionDuration  // ms transition duration
          );
        }
      }
      lastNodeClick = t;
    })
    .linkWidth(link => highlightLinks.has(link) ? 1 : 0.8)
    .linkDirectionalParticles(link => highlightLinks.has(link) ? 2 : 0)
    .linkDirectionalParticleWidth(1.5)
    .linkDirectionalParticleSpeed(0.01)
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
    });

  function updateHighlight() {
    // trigger update of highlighted objects in scene
    Graph
      .nodeColor(Graph.nodeColor())
      .linkWidth(Graph.linkWidth())
      .linkDirectionalParticles(Graph.linkDirectionalParticles());
  }

  // Bloom Post-Processing effect
  const bloomPass = new UnrealBloomPass();
  bloomPass.strength = bloomPassStrength;
  bloomPass.radius = bloomPassRadius;
  bloomPass.threshold = bloomPassThreshold;
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
      // if(el.offsetWidth != 0) {
      //   erd.uninstall(el);
      // }
    }
  );

  // camera orbit
  let angle = 0;
  setInterval(() => {
    if (isCamRotationActive) {
      Graph.cameraPosition({
        x: camDistance * Math.sin(angle),
        z: camDistance * Math.cos(angle)
      });
      angle += Math.PI / 500;
    }
  }, 10);

  // Add HTML toggle buttons listeners
  document.getElementById('rotationToggle').addEventListener('click', event => {
    isCamRotationActive = !isCamRotationActive;
    event.target.innerHTML = `${(isCamRotationActive ? 'Pause' : 'Resume')} Rotation`;
  });
  document.getElementById('animationToggle').addEventListener('click', event => {
    isAnimationActive ? Graph.pauseAnimation() : Graph.resumeAnimation();
    isAnimationActive = !isAnimationActive;
    event.target.innerHTML = `${(isAnimationActive ? 'Pause' : 'Resume')} Animation`;
  });
})

