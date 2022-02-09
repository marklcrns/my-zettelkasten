// 3D Directed graph
// https://github.com/vasturiano/3d-force-graph

import { UnrealBloomPass } from 'https://unpkg.com/three@0.127.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import dat from "https://cdn.skypack.dev/dat.gui@0.7.7";

var excludedNodes = [
  "index",
  "zettel",
  "book",
  "programming",
  "science",
  "psychology",
  "history",
  "README",
  "faq",
  "LICENSE"
];

var camRotationActive = false;
var animationActive = true;
var graphVisibility = false;
var nodeGeometryMode = 1;   // 0: text-node, 1: text-only, 2: node-only

$.getJSON('../cache.json', function(data) {
  // console.log(data.Graph);

  const GRAPH_HEIGHT = 600;
  const GRAPH_WIDTH = $('.pandoc').width();
  const NODE_REL_SIZE = 3;
  const ON_CLICK_CAM_DISTANCE = 300;
  const FOCUS_TRANSITION_DURATION = 2500;
  const DOUBLE_CLICK_DURATION = 800;
  // const FORCE_STRENGTH = -graph.nodes.length * 2;
  // const FORCE_STRENGTH = -100;

  var hoverNode = null;
  var highlightNodes = new Set();
  var highlightLinks = new Set();
  var camDistance = 800;

  var lastNodeClick = 0;
  var lastBackgroundClick = 0;

  var Graph = createNewForceGraph(nodeGeometryMode, data.Graph);

  // Some Properties
  Graph
    .nodeAutoColorBy("clusterid")
    .nodeVal('size')
    .linkColor(() => 'rgba(255,255,255,0.4)')
    .width(GRAPH_WIDTH)
    .height(GRAPH_HEIGHT)
    .showNavInfo(true)
    .d3Force("charge")
    .strength(node => { return -(node.size * 15); });

  // DAG
  Graph
    .dagMode(null)
    .dagLevelDistance(50)
    .nodeRelSize(NODE_REL_SIZE)
    .backgroundColor('#101020')
    .d3Force('collision', d3.forceCollide(node => Math.cbrt(node.size) * NODE_REL_SIZE))
    .d3VelocityDecay(0.3)

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
        if (camRotationActive) {
          camRotationActive = false;
        }
        // Aim at node from outside it
        camDistance = ON_CLICK_CAM_DISTANCE;
        const distRatio = 1 + camDistance/Math.hypot(node.x, node.y, node.z);

        Graph.cameraPosition(
          { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new position
          node, // lookAt ({ x, y, z })
          FOCUS_TRANSITION_DURATION  // ms transition duration
        );
      }
      lastNodeClick = t;
    })
    .onNodeRightClick(node => {
      window.open("../" + node.value + ".html", "_blank").focus();
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
    if (camRotationActive) {
      Graph.cameraPosition({
        x: camDistance * Math.sin(angle),
        z: camDistance * Math.cos(angle)
      });
      angle += Math.PI / 500;
    }
  }, 10);

  // Add HTML toggle buttons listeners
  document.getElementById('visibilityToggle').addEventListener('click', event => {
    graphVisibility = !graphVisibility;
    var graphContainer = document.getElementById('3d-graph-container');
    var graphOrientControl = document.getElementById('graph-control');
    if (graphVisibility) {
      graphContainer.style['display'] = 'none';
      graphOrientControl.style['visibility'] = 'hidden';
    } else {
      graphContainer.style['display'] = 'inherit';
      graphOrientControl.style['visibility'] = 'inherit';
    }
    graphVisibility ? Graph.pauseAnimation() : Graph.resumeAnimation();
    event.target.innerHTML = `${(graphVisibility ? 'Show' : 'Hide')} 3D Graph`;
  });

  addGUIDAGControls(Graph, data.Graph);
  loadGraphZettelJumbotron(Graph);
})


function createNewForceGraph(mode, data) {
  // Text-only nodes graph
  const graph = ForceGraph3D({ extraRenderers: [new THREE.CSS2DRenderer()] })
  (document.getElementById("3d-graph"))
    .graphData(buildGraph(data));

  setNodeGeometryMode(graph, mode);
  return graph
}

function setNodeGeometryMode(graph, mode) {
  if (mode === 0) {
    // Bright Bloom Post-Processing effect
    const bloomPassBright = new UnrealBloomPass();
    bloomPassBright.strength = 1.8;
    bloomPassBright.radius = 1;
    bloomPassBright.threshold = 0.1;
    graph
      .nodeThreeObject((node) => {
        const nodeEl = document.createElement('div');
        nodeEl.textContent = node.name;
        nodeEl.style.color = node.color;
        nodeEl.className = 'node-label';
        return new THREE.CSS2DObject(nodeEl);
      })
      .nodeThreeObjectExtend(true)
      .nodeLabel('date')
      .postProcessingComposer().passes[1] = bloomPassBright;
  } else if (mode === 1) {
    // Dim Bloom Post-Processing effect
    const bloomPassDim = new UnrealBloomPass();
    bloomPassDim.strength = 0.8;
    bloomPassDim.radius = 1;
    bloomPassDim.threshold = 0.1;
    graph
      .nodeThreeObject((node) => {
        const sprite = new SpriteText(node.name);
        sprite.material.depthWrite = false; // make sprite background transparent
        sprite.color = node.color;
        sprite.textHeight = 8;
        return sprite;
      })
      .nodeThreeObjectExtend(false)
      .nodeLabel('date')
      .postProcessingComposer().passes[1] = bloomPassDim;
  } else if (mode === 2){
    // Low Bloom Post-Processing effect
    const bloomPassLow = new UnrealBloomPass();
    bloomPassLow.strength = 1.4;
    bloomPassLow.radius = 1;
    bloomPassLow.threshold = 0.1;
    graph
      .nodeThreeObject((node) => {
        var sphere = new THREE.SphereGeometry();
        var lambert = new THREE.MeshLambertMaterial({ color: node.color, transparent: true, opacity: 0.75 });
        var mesh = new THREE.Mesh(sphere, lambert);
        var group = new THREE.Group();
        group.add(mesh);
        return group;
      })
      .nodeThreeObjectExtend(true)
      .nodeLabel('name')
      .postProcessingComposer().passes[1] = bloomPassLow;
  }
}


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

          var visited = [];
          // recache clusterid from target's existing links
          recacheNodeImmediateLinks(link.target, links, nodeMap, visited, false);
          recacheNodeImmediateLinks(link.source, links, nodeMap, visited, false);
          // Simply resize source without changing clusterid
          recacheNodeImmediateLinks(link.source, links, nodeMap, visited, true);

          links.push(link);
        }
      });
    }
  })

  function recacheNodeImmediateLinks(source, links, nodeMap, visited, isResize) {
    for (var i = 0; i < links.length; ++i) {
      if (!visited.includes(i) && links[i].source === source) {
        var scid = nodes[nodeMap[source]].clusterid;
        visited.push(i);
        if (nodes[nodeMap[links[i].target]].clusterid === scid) {
          nodes[nodeMap[source]].size += 2;
        } else if (!isResize){
          nodes[nodeMap[links[i].target]].clusterid = scid;
        }
        recacheNodeImmediateLinks(links[i].source, links, nodeMap, visited, isResize);
      }
    }
  }

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
  const nodeCount = graph.graphData().nodes.length;
  loader.load('./static/optimer_regular.typface.json', function(font) {

    // Fetch title-h1 element stripped of non-alphanumeric characters to uppercase
    const titleGeometry = new THREE.TextGeometry(
      document.getElementById('title-h1').innerText.replace(/\W/g, '').toUpperCase(),
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
    const titleMaterial = new THREE.MeshLambertMaterial({color: 0x3F3F3F, side: THREE.DoubleSide});
    const titleMesh = new THREE.Mesh(titleGeometry, titleMaterial);
    titleMesh.position.set(-titleGeometry.boundingSphere.radius, 100, -(nodeCount * 15)); // (x, y, z)

    const countGeometry = new THREE.TextGeometry(
      'ct: ' +  nodeCount.toString(),
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
    const countMaterial = new THREE.MeshLambertMaterial({color: 0x8F6700, side: THREE.DoubleSide});
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

// Close the dropdown menu if the user clicks outside of it
window.onclick = function(event) {
  if (!event.target.matches('.dropbtn')) {
    var dropdowns = document.getElementsByClassName("dropdown-content");
    var i;
    for (i = 0; i < dropdowns.length; i++) {
      var openDropdown = dropdowns[i];
      if (openDropdown.classList.contains('show')) {
        openDropdown.classList.remove('show');
      }
    }
  }
}

function addGUIDAGControls(graph, data) {
  const controlsDict = {
    'Scattered': 'null',
    'Top-down': 'td',
    'Bottom-up': 'bu',
    'Left-to-right': 'lr',
    'Right-to-left': 'rl',
    'Near-to-far': 'zout',
    'Far-to-near': 'zin',
    'Outwards-radially': 'radialout',
    'Inwards-radially': 'radialin',
  };

  const controls = {
    '3D Graph Orientation': 'Scattered',
    'Geometry' : 'Text-Only',
    'Animation' : animationActive,
    'Rotation' : camRotationActive,
  };
  // const gui = new dat.GUI({width: 300, closeOnTop: true});
  const gui = new dat.GUI({autoPlace: false, width: 280, closeOnTop: true});
  $('#dat-gui').prepend($(gui.domElement));
  gui.domElement.id = 'graph-control';
  gui.add(controls, '3D Graph Orientation', [
    'Scattered',
    'Top-down',
    'Bottom-up',
    'Left-to-right',
    'Right-to-left',
    'Near-to-far',
    'Far-to-near',
    'Outwards-radially',
    'Inwards-radially',
    'Scattered (index)',
    'Top-down (index)',
    'Bottom-up (index)',
    'Left-to-right (index)',
    'Right-to-left (index)',
    'Near-to-far (index)',
    'Far-to-near (index)',
    'Outwards-radially (index)',
    'Inwards-radially (index)',
  ])
    .onChange(orientation => {
      if (orientation.includes('(index)')) {
        const idx = excludedNodes.indexOf('index');
        if (idx > -1) {
          excludedNodes.splice(idx, 1);
          graph &&
            graph
            .graphData(buildGraph(data));
          loadGraphZettelJumbotron(graph);
        }
        graph && graph.dagMode(controlsDict[orientation.replace(' (index)', '')]);
      } else {
        if (!excludedNodes.includes('index')) {
          excludedNodes.push('index');
          graph &&
            graph
            .graphData(buildGraph(data));
          loadGraphZettelJumbotron(graph);
        }
        graph && graph.dagMode(controlsDict[orientation]);
      }
      // console.log("excluded nodes: [" + excludedNodes + "]");
    });
  gui.add(controls, 'Geometry', [
    'Text-Only',
    'Node-Only',
    'Text-Node'
  ])
    .onChange(orientation => {
      if (orientation.includes('Text-Node')) {
        setNodeGeometryMode(graph, 0);
      } else if (orientation.includes('Text-Only')) {
        setNodeGeometryMode(graph, 1);
      } else if (orientation.includes('Node-Only')) {
        setNodeGeometryMode(graph, 2);
      }
    });
  gui.add(controls, 'Animation', [true, false])
    .onChange(toggle => {
      console.log(toggle.includes('true'));
      if (toggle.includes('true')) {
        graph.resumeAnimation();
      } else if (toggle.includes('false')){
        graph.pauseAnimation();
      }
    });
  gui.add(controls, 'Rotation', [true, false])
    .onChange(toggle => {
      camRotationActive = toggle.includes('true');
    });
}

function updateHighlight(graph) {
  // trigger update of highlighted objects in scene
  graph
    .nodeColor(graph.nodeColor())
    .linkWidth(graph.linkWidth())
    .linkDirectionalParticles(graph.linkDirectionalParticles());
}

