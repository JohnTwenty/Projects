const layout = `
<div id="top-bar">Derelict Game Editor</div>
<div id="buttons1">
  <button id="btn-new">New</button>
  <button id="btn-load">Load</button>
  <button id="btn-save">Save</button>
  <button id="btn-play">Play</button>
</div>
<div id="main">
  <div id="viewport-wrap">
    <canvas id="viewport" width="640" height="640"></canvas>
    <canvas id="overlay" width="640" height="640"></canvas>
  </div>
  <ul id="segment-palette"></ul>
</div>
<div id="buttons2">
  <button id="rot-left">Rotate Left</button>
  <button id="rot-right">Rotate Right</button>
  <button id="unselect">Unselect</button>
  <button id="place">Place</button>
  <button id="delete">Delete</button>
  <button id="edit-mission">Edit Mission Data</button>
</div>
<div id="token-palette"></div>
`;
export default layout;
