"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabaseClient";

const ForceGraph2D = dynamic(() => import("react-force-graph").then(mod => mod.ForceGraph2D), {
  ssr: false,
});

export default function RelationsPage() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });

  useEffect(() => {
    const fetchRelations = async () => {
      const { data: nodes } = await supabase.from("characters").select("*");
      const { data: links } = await supabase.from("relations").select("*");

      setGraphData({
        nodes: nodes.map(n => ({ id: n.id, name: n.name })),
        links: links.map(l => ({
          source: l.source_id,
          target: l.target_id,
        })),
      });
    };

    fetchRelations();
  }, []);

  return (
    <div style={{ height: "80vh", background: "#fafafa" }}>
      <ForceGraph2D
        graphData={graphData}
        nodeLabel="name"
        nodeAutoColorBy="id"
        linkColor={() => "rgba(0,0,0,0.4)"}
      />
    </div>
  );
}


