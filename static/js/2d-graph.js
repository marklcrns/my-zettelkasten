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

function excludeNonMatchingTags(graph, tags) {
  Object.values(graph.vertices).forEach((n) => {
    for (const tag of n.Meta.tags) {
      if (tags.includes(tag)) return;
    }
    if (!excludedNodes.includes(n.ID)) excludedNodes.push(n.ID);
  });
}

// 2D Directed Graph
d3.json("../cache.json", function (d) {
  return d;
})
  .then(function (data) {
    excludeNonMatchingTags(data.Graph, $('#neuron-tags-pane').text());
    var graph = buildGraph(data.Graph);

    var pandocDiv = document.getElementsByClassName("pandoc")[0];
    var width = pandocDiv.clientWidth;
    var height = 600;

    // Create a scale for radius
    var radius_scale = d3
      .scaleSqrt()
      .domain([
        d3.min(Object.values(graph.nodes), (n) => n.size),
        d3.max(Object.values(graph.nodes), (n) => n.size),
      ])
      .range([3, Math.max(width/45, 10)]);

    // Create color scale
    var unpinned_color_scale = d3
      .scaleLinear()
      .domain([
        d3.min(Object.values(graph.nodes), (n) => n.size),
        d3.max(Object.values(graph.nodes), (n) => n.size),
      ])
      .range(["#ffffff", "#cc3d3d"]);

    // Create color scale
    var pinned_color_scale = d3
      .scaleLinear()
      .domain([
        d3.min(Object.values(graph.nodes), (n) => n.clusterid),
        d3.max(Object.values(graph.nodes), (n) => n.clusterid),
      ])
      .range(["#ffffff", "#19a6a6"]);


    var force = d3
      .forceSimulation()
      .nodes(Object.values(graph.nodes))
      .force("link", d3.forceLink(graph.links).distance(70).id((d) => d.id))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("x", d3.forceX())
      .force("y", d3.forceY())
      .force("charge", d3.forceManyBody().strength(-width/4).distanceMin(40))
      .alphaTarget(1)
      .on("tick", tick);


    var svg = d3
      .select(".pandoc")
      .insert("svg", ":nth-child(3)")
      .attr("width", width)
      .attr("height", height);

    svg
      .append('defs')
      .append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', [0, 0, 10, 10])
      .attr('refX', 1)
      .attr('refY', 5)
      .attr('markerWidth', 10)
      .attr('markerHeight', 15)
      .attr('orient', 'auto-start-reverse')
      .append('path')
      .attr('d', d3.line()([[0,0], [10,5], [0,10]]))
      .attr('stroke', 'black');

    // add the links
    var path = svg
      .append("g")
      .selectAll("path")
      .data(graph.links)
      .enter()
      .append("path")
      .attr("class", (d) => "link")
      // .attr("marker-end", "url(#arrow)");

    // define the nodes
    var node = svg
      .selectAll(".node")
      .data(force.nodes())
      .enter()
      .append("g")
      .attr("class", "node")
      .call(
        d3
        .drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended))
      .on("click", onClick)
      .on("dblclick", dblClick);

    // add the nodes
    node
      .append("circle")
      .attr("id", (d) => "circle-" + d.id)
      .attr("r", (d) => radius_scale(d.size))
      .attr( "fill",
        (d) => unpinned_color_scale(d.size)
      );

    // add node labels
    node
      .append("text")
      .attr("id", (d) => "label-" + d.id)
      .attr("class", "node_labels")
      .attr("x", (d) => radius_scale(d.size))
      .attr("y", (d) => -radius_scale(d.size))
      .text((d) => d.name);

    // add the curvy lines
    function tick() {
      path.attr("d", function (d) {
        var dx = d.target.x - d.source.x,
          dy = d.target.y - d.source.y,
          dr = Math.sqrt(dx * dx + dy * dy);
        return (
          "M" +
          d.source.x +
          "," +
          d.source.y +
          "A" +
          dr +
          "," +
          dr +
          " 0 0,1 " +
          d.target.x +
          "," +
          d.target.y
        );
      });

      node.attr("transform", function (d) {
        return "translate(" + d.x + "," + d.y + ")";
      });
    }

    function dragstarted(event, d) {
      if (!event.active) force.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
      d.fixed = true;
      node.select("#circle-" + d.id)
        .attr("fill", pinned_color_scale(d.clusterid))
    }

    function dragended(event, d) {
      if (!event.active) force.alphaTarget(0);
      if (d.fixed) {
        d.fx = d.x;
        d.fy = d.y;
      } else {
        d.fx = null;
        d.fy = null;
      }
    }

    function onClick(event, d) {
      if (d.fixed && event.ctrlKey) {
        d.fixed = false;
        node.select("#circle-" + d.id)
          .attr("fill", unpinned_color_scale(d.size))
        d.fx = null;
        d.fy = null;
      }
    }

    function dblClick(event, d) {
      window.open("../" + d.slug + ".html");
    }

  })
  .catch(function (error) {
    console.log(error);
  });

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
      node.slug = e.Slug;
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

  return graph;
}

