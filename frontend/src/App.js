import React, { useState, useEffect } from "react";
import axios from "axios";
import './App.css';

import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import PasteTrace from "./components/PasteTrace";
import AllTraces from "./components/AllTraces";
import CompareView from "./components/CompareView";
import TraceDetail from "./components/TraceDetail";
import IncidentsList from "./components/IncidentsList";

export const API = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";

export default function App() {
  const [currentView, setCurrentView] = useState("paste");
  const [traces, setTraces] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [selectedTraceId, setSelectedTraceId] = useState(null);

  const fetchTraces = async () => {
    try {
      const res = await axios.get(`${API}/traces`);
      setTraces(res.data);
    } catch (err) {
      console.error("Failed to fetch traces:", err);
    }
  };

  useEffect(() => {
    fetchTraces();
  }, [currentView]);

  const filteredTraces = traces.filter((t) => {
    if (filter === "ERROR" && !t.has_error) return false;
    if (filter === "OK" && t.has_error) return false;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      const traceIdMatch = t.trace_id.toLowerCase().includes(q);
      const serviceMatch = t.services.some(s => s.toLowerCase().includes(q));
      const categoryMatch = t.category.toLowerCase().includes(q);
      
      if (!traceIdMatch && !serviceMatch && !categoryMatch) {
        return false;
      }
    }
    return true;
  });

  const renderContent = () => {
    switch (currentView) {
      case "paste":
        return (
          <PasteTrace 
            onIngestSuccess={fetchTraces} 
            onSelectTrace={setSelectedTraceId} 
          />
        );
      case "all":
        return (
          <AllTraces 
            traces={traces} 
            filteredTraces={filteredTraces} 
            filter={filter} 
            setFilter={setFilter} 
            onSelectTrace={setSelectedTraceId} 
          />
        );
      case "incidents":
        return (
          <IncidentsList 
            onSelectTrace={setSelectedTraceId} 
          />
        );
      case "banking":
        return (
          <AllTraces 
            title="Banking Dashboard" 
            description="Monitor transaction and banking service traces"
            traces={traces.filter(t => t.category === "banking")} 
            filteredTraces={filteredTraces.filter(t => t.category === "banking")} 
            filter={filter} 
            setFilter={setFilter} 
            onSelectTrace={setSelectedTraceId} 
          />
        );
      case "food":
        return (
          <AllTraces 
            title="Food Delivery Dashboard" 
            description="Monitor ordering, restaurant and delivery workflows"
            traces={traces.filter(t => t.category === "food")} 
            filteredTraces={filteredTraces.filter(t => t.category === "food")} 
            filter={filter} 
            setFilter={setFilter} 
            onSelectTrace={setSelectedTraceId} 
          />
        );
      case "retail":
        return (
          <AllTraces 
            title="Retail Dashboard" 
            description="Monitor shopping, inventory and payment workflows"
            traces={traces.filter(t => t.category === "retail")} 
            filteredTraces={filteredTraces.filter(t => t.category === "retail")} 
            filter={filter} 
            setFilter={setFilter} 
            onSelectTrace={setSelectedTraceId} 
          />
        );
      case "general":
        return (
          <AllTraces 
            title="General Dashboard" 
            description="Monitor uncategorized and miscellaneous traces"
            traces={traces.filter(t => t.category === "general")} 
            filteredTraces={filteredTraces.filter(t => t.category === "general")} 
            filter={filter} 
            setFilter={setFilter} 
            onSelectTrace={setSelectedTraceId} 
          />
        );
      case "compare":
        return <CompareView traces={traces} />;
      default:
        return (
          <PasteTrace 
            onIngestSuccess={fetchTraces} 
            onSelectTrace={setSelectedTraceId} 
          />
        );
    }
  };

  return (
    <div className="App">
      <Sidebar currentView={currentView} setView={setCurrentView} />
      <div className="MainContent">
        <TopBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        <div className="ContentArea">
          {renderContent()}
        </div>
      </div>
      
      {selectedTraceId && (
        <TraceDetail traceId={selectedTraceId} onClose={() => setSelectedTraceId(null)} />
      )}
    </div>
  );
}
