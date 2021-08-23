// 3D Directed graph
// https://github.com/vasturiano/3d-force-graph

import { UnrealBloomPass } from '//cdn.skypack.dev/three/examples/jsm/postprocessing/UnrealBloomPass.js';

var excludedNodes = ["index", "README", "faq", "LICENSE"];

$.getJSON('../cache.json', function(data) {

  console.log(data.Graph);

  const NODE_REL_SIZE = 3;
  const ON_CLICK_CAM_DISTANCE = 150;
  const FOCUS_TRANSITION_DURATION = 2500;
  const DOUBLE_CLICK_DURATION = 500;
  // const FORCE_STRENGTH = -graph.nodes.length * 2;
  const FORCE_STRENGTH = -15;
  const BLOOM_PASS_STRENGTH = 1.5;
  const BLOOM_PASS_RADIUS = 1;
  const BLOOM_PASS_THRESHOLD = 0.1;

  var hoverNode = null;
  var highlightNodes = new Set();
  var highlightLinks = new Set();
  var isCamRotationActive = false;
  var isAnimationActive = true;
  var camDistance = 300;

  var lastNodeClick = 0;
  var lastBackgroundClick = 0;

  // // Text-only nodes graph
  // const Graph = ForceGraph3D()
  //   (document.getElementById("3d-graph"))
  //   .graphData(graph)
  //
  // Graph
  //   .nodeThreeObject((node) => {
  //     // const sprite = new SpriteText(node.name);
  //     // sprite.material.depthWrite = false; // make sprite background transparent
  //     // sprite.color = node.color;
  //     // sprite.textHeight = 8;
  //     // return sprite;
  //   })

  // Create graph
  const Graph = ForceGraph3D({ extraRenderers: [new THREE.CSS2DRenderer()] })
    (document.getElementById("3d-graph"))
    .graphData(buildGraph(data.Graph));

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
    .d3Force("charge").strength(FORCE_STRENGTH);

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
    .onBackgroundClick((node) => {
      var d = new Date();
      var t = d.getTime();
      if ((t - lastBackgroundClick) < DOUBLE_CLICK_DURATION) {    // double click
        Graph
          .zoomToFit(500, 0, node => true);
      }
      lastBackgroundClick = t;
    })
    .onNodeClick(node => {
      var d = new Date();
      var t = d.getTime();
      // Double click
      if ((t - lastNodeClick) < DOUBLE_CLICK_DURATION) {
        window.open("../" + node.value + ".html", "_blank").focus();
      // Single click
      } else{
        if (!isCamRotationActive) {
          // Aim at node from outside it
          camDistance = ON_CLICK_CAM_DISTANCE;
          const distRatio = 1 + camDistance/Math.hypot(node.x, node.y, node.z);

          Graph.cameraPosition(
            { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new position
            node, // lookAt ({ x, y, z })
            FOCUS_TRANSITION_DURATION  // ms transition duration
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

      updateHighlight(Graph);
    })
    .onLinkHover(link => {
      highlightNodes.clear();
      highlightLinks.clear();

      if (link) {
        highlightLinks.add(link);
        highlightNodes.add(link.source);
        highlightNodes.add(link.target);
      }

      updateHighlight(Graph);
    });

  // Bloom Post-Processing effect
  const bloomPass = new UnrealBloomPass();
  bloomPass.strength = BLOOM_PASS_STRENGTH;
  bloomPass.radius = BLOOM_PASS_RADIUS;
  bloomPass.threshold = BLOOM_PASS_THRESHOLD;
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

  addGUIDAGControls(Graph, data.Graph);
  loadGraphZettelJumbotron(Graph);
})

function buildGraph(data) {
  var graph = {};
  var nodeMap = {};
  var clusterCount = 0;

  // Build nodes
  var nodes = [];
  Object.entries(data.vertices).forEach(([node,e]) => {
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
  Object.entries(data.adjacencyMap).forEach(([source, entry]) => {
    if (!$.isEmptyObject(entry)) {
      Object.entries(entry).forEach((e) => {
        var target = e[0];
        var folgeType = e[1][0];

        if (!excludedNodes.includes(source) && !excludedNodes.includes(target)) {
          var link = {};
          if (folgeType === "folgeinv") {
            link.source = target;
            link.target = source;
          } else if (folgeType === "folge") {
            link.source = source;
            link.target = target;
          } else {
            return;   // equivalent to conventional `continue`
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

  return graph;
}

function loadGraphZettelJumbotron(graph) {
  const loader = new THREE.FontLoader();
  loader.load('./static/optimer_regular.typface.json', function(font) {

    const titleGeometry = new THREE.TextGeometry(
      document.getElementById('title-h1').innerHTML.toUpperCase(),
      {
        font: font,
        size: 150,
        height: 10,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 10,
        bevelSize: 6,
        bevelOffset: 0,
        bevelSegments: 5
      }
    );
    titleGeometry.computeBoundingSphere();
    const titleMaterial = new THREE.MeshLambertMaterial({color: 0x5F5F5F, side: THREE.DoubleSide});
    const titleMesh = new THREE.Mesh(titleGeometry, titleMaterial);
    titleMesh.position.set(-titleGeometry.boundingSphere.radius, 100, -600); // (x, y, z)

    const countGeometry = new THREE.TextGeometry(
      'ct: ' +  graph.graphData().nodes.length.toString(),
      {
        font: font,
        size: 50,
        height: 10,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 8,
        bevelSize: 4,
        bevelOffset: 0,
        bevelSegments: 5
      }
    );
    countGeometry.computeBoundingSphere();
    const countMaterial = new THREE.MeshLambertMaterial({color: 0xAF8700, side: THREE.DoubleSide});
    const countMesh = new THREE.Mesh(countGeometry, countMaterial);
    countMesh.position.set(
      -titleMesh.position.x - countGeometry.boundingSphere.radius,  // x
      titleMesh.position.y - countGeometry.boundingSphere.center.y,                                               // y
      titleMesh.position.z + 50                                           // z
    );

    // Filter out existing TextGeometry objects
    var filtered = graph.scene().children.filter(child => {
      return !(child.type === "Mesh" && child.geometry.type === "TextGeometry");
    });
    graph.scene().children = filtered;

    graph.scene().add(titleMesh);
    graph.scene().add(countMesh);
  });
}

function addGUIDAGControls(graph, data) {
  const controls = { '3D Graph DAG': 'null'};
  const gui = new dat.GUI();
  gui.add(controls, '3D Graph DAG', [
    'null',
    'td',
    'bu',
    'lr',
    'rl',
    'zout',
    'zin',
    'radialout',
    'radialin',
    "null-index",
    'td-index',
    'bu-index',
    'lr-index',
    'rl-index',
    'zout-index',
    'zin-index',
    'radialout-index',
    'radialin-index',
  ])
    .onChange(orientation => {
      if (orientation.includes('index')) {
        const idx = excludedNodes.indexOf('index');
        if (idx > -1) {
          excludedNodes.splice(idx, 1);
          graph &&
            graph
            .nodeAutoColorBy("size")
            .graphData(buildGraph(data));
          loadGraphZettelJumbotron(graph);
        }
        graph && graph.dagMode(orientation.replace('-index', ''));
      } else {
        if (!excludedNodes.includes('index')) {
          excludedNodes.push('index');
          graph &&
            graph
            .nodeAutoColorBy("clusterid")
            .graphData(buildGraph(data));
          loadGraphZettelJumbotron(graph);
        }
        graph && graph.dagMode(orientation)
      }
      console.log("excluded nodes: [" + excludedNodes + "]");
    });
}

function updateHighlight(graph) {
  // trigger update of highlighted objects in scene
  graph
    .nodeColor(graph.nodeColor())
    .linkWidth(graph.linkWidth())
    .linkDirectionalParticles(graph.linkDirectionalParticles());
}

