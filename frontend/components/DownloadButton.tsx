"use client"
import React  from "react";

 export default function DownloadButton({ path} : { path : string }){
  const download = async () => {
    try {
      const res = await fetch(`/${process.env.NEXT_PUBLIC_API_BASE}/api/files/download?path=${encodeURIComponent(path)}&expires=300`);
      if(!res.ok){
        const err =  await res.json();
        throw new Error(err?.error || "Failed to get url");
      }
      const { url } = await res.json();
      //validate url exists
      if ( !url ) throw new Error("No signed  URL returned");
      //use window.location.href to perform GET download 
      window.location.href = url;
    } catch(e: any) {
      console.error("Download error:", e);
      alert("Download failed: "+ (e.meesage || "Unknown"));
    }
 };

return <button onClick={download} className="px-3 py-1 bg-blue-600 text-white rounded">Download</button>;

 }