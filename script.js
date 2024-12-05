// Fetch data from the Dune API and display the graph
const fetchDuneData = async () => {
  const options = {
    method: "GET",
    headers: { "X-DUNE-API-KEY": "yjDfkTzjw4TGkuKFSk1uKUqi4aiv6RJE" },
  };

  try {
    // Fetch the data
    const response = await fetch(
      "https://api.dune.com/api/v1/query/4374622/results?limit=1000",
      options
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    const rows = data.result.rows;

    // Create nodes and links for the graph
    const nodes = [];
    const links = [];
    const addressSet = new Set(); // To avoid duplicate nodes

    rows.forEach((row) => {
      const { address, interaction_frequency } = row;

      // Add nodes
      if (!addressSet.has(address)) {
        nodes.push({ id: address, interaction_frequency });
        addressSet.add(address);
      }

      // Add links to simulate interaction flow
      links.push({
        source: address,
        target: "CentralNode", // You can customize the central node logic
        value: interaction_frequency,
      });
    });

    // Add the central node
    nodes.push({ id: "CentralNode", interaction_frequency: "N/A" });

    // Draw the graph
    drawGraph({ nodes, links });
  } catch (error) {
    console.error("Error fetching data:", error);
    alert("Failed to fetch data. Please try again.");
  }
};

// Draw the graph using D3.js with zoom and pan functionality
const drawGraph = (data) => {
  const graphDiv = document.getElementById("graph");
  const width = graphDiv.clientWidth;
  const height = graphDiv.clientHeight;

  const svg = d3
    .select(graphDiv)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const zoomGroup = svg.append("g"); // Group to allow zoom and pan

  const simulation = d3
    .forceSimulation(data.nodes)
    .force("link", d3.forceLink(data.links).id((d) => d.id).distance(150))
    .force("charge", d3.forceManyBody().strength(-800))
    .force("center", d3.forceCenter(width / 2, height / 2));

  const link = zoomGroup
    .append("g")
    .selectAll("line")
    .data(data.links)
    .enter()
    .append("line")
    .attr("stroke-width", (d) => Math.sqrt(d.value))
    .attr("stroke", "#aaa");

  const node = zoomGroup
    .append("g")
    .selectAll("circle")
    .data(data.nodes)
    .enter()
    .append("circle")
    .attr("r", (d) => (d.id === "CentralNode" ? 15 : 10))
    .attr("fill", (d) => (d.id === "CentralNode" ? "#ff6b6b" : "#4CAF50"))
    .call(drag(simulation));

  const label = zoomGroup
    .append("g")
    .selectAll("text")
    .data(data.nodes)
    .enter()
    .append("text")
    .text((d) => d.id)
    .attr("font-size", "10px")
    .attr("fill", "white") // White text for better contrast
    .attr("dy", ".35em")
    .attr("dx", 15);

  simulation.on("tick", () => {
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);

    label.attr("x", (d) => d.x).attr("y", (d) => d.y);
  });

  // Add zoom and pan functionality
  svg.call(
    d3
      .zoom()
      .extent([
        [0, 0],
        [width, height],
      ])
      .scaleExtent([0.5, 5]) // Zoom scale limits
      .on("zoom", (event) => {
        zoomGroup.attr("transform", event.transform);
      })
  );

  function drag(simulation) {
    return d3
      .drag()
      .on("start", function (event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", function (event, d) {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", function (event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
  }
};

// Call fetchDuneData to render the graph
fetchDuneData();
