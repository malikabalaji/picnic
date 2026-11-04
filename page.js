"use client";
import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    import("./snapback").then((m) => m.start());
  }, []);
  return (
    <>
      <div id="root">
        <div className="app">
          <div className="ob">
            <div className="row muted"><span className="spin"></span>Opening Picnic</div>
          </div>
        </div>
      </div>
      <div id="sheet"></div>
      <div id="toast" className="toast" hidden></div>
    </>
  );
}
