// Function to fetch data from the Dune API and display the graph
const fetchDuneData = async (ethAddress) => {
  try {
    // Show the loading spinner
    document.getElementById("loading").style.display = "block";

    // First POST request to fetch execution ID
    const response = await fetch('https://api.dune.com/api/v1/query/4617489/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-dune-api-key': '4TS6eluto3kXBz3rJMMEyhbl0vRONnQ5', // Replace with your API key
      },
      body: JSON.stringify({
        query_parameters: { eth_address: ethAddress }, // Pass the Ethereum address
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      console.error('Error from Dune API:', errorBody);
      throw new Error('Failed to fetch data from Dune');
    }

    const postData = await response.json();
    const executionId = postData.execution_id;
    let isFinished = false;
    let resultData = null;

    // Poll for the query execution results
    while (!isFinished) {
      const resultResponse = await fetch(`https://api.dune.com/api/v1/execution/${executionId}/results`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-dune-api-key': '4TS6eluto3kXBz3rJMMEyhbl0vRONnQ5', // Replace with your API key
        },
      });

      if (!resultResponse.ok) {
        throw new Error('Failed to fetch results from Dune');
      }

      const resultDataResponse = await resultResponse.json();
      console.log('Dune API GET Result:', resultDataResponse);

      if (resultDataResponse.is_execution_finished) {
        isFinished = true;
        resultData = resultDataResponse.result.rows;
      } else {
        // Wait for a few seconds before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Now we have the resultData (the rows)
    const rows = resultData;

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
        target: ethAddress, // Central node is the searched Ethereum address
        value: interaction_frequency,
      });
    });

    // Add the central node (Ethereum address)
    nodes.push({ id: ethAddress, interaction_frequency: "N/A" });

    // Draw the graph
    drawGraph({ nodes, links });

    // Hide the loading spinner after the graph is drawn
    document.getElementById("loading").style.display = "none";
    document.getElementById("graph").style.border = "1px solid #ddd";
  } catch (error) {
    console.error("Error fetching data:", error);
    alert("Failed to fetch data. Please try again.");
    // Hide the loading spinner in case of error as well
    document.getElementById("loading").style.display = "none";

  }
};

// Function to update the graph based on user input
const updateGraph = () => {
  const ethAddress = document.getElementById("ethAddressInput").value.trim();
  if (ethAddress) {
    // Clear the existing graph
    d3.select("#graph").selectAll("*").remove();
    // Fetch new data and render the graph
    fetchDuneData(ethAddress);
  } else {
    alert("Please enter a valid Ethereum address.");
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
    .attr("r", (d) => (d.id === data.nodes[data.nodes.length - 1].id ? 15 : 10))
    .attr("fill", (d) => (d.id === data.nodes[data.nodes.length - 1].id ? "#ff6b6b" : "#4CAF50"))
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
