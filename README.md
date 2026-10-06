# Waterlab 3D: เมืองริมน้ำ

Thai-language 3D water-design sandbox in a fictional river town. The miniature includes terrain, streets, homes, taller buildings, bridges and an adjustable reservoir dam. One scene unit equals one metre in every axis; elevations use a shared local reference of 0.00 m.

Serve `dist/` with a static web server; Three.js and its OrbitControls are already included in `dist/vendor/`. For example, run `python3 -m http.server 8080 --directory dist` and open `http://localhost:8080`. The JavaScript runtime needs no npm install or build step.

The hydraulic model treats rivers, canals and ponds as water storage and links as zero-storage transfers. Channels approximate Manning flow. Gates affect outlet capacity; a dam adds two gated outlets and spill over its crest. Water crossing a storage bank is recorded as accumulated overflow. Terrain relief and the town are a visual model: this release does not spread floodwater over streets and buildings. A designed layout stays in the browser only and is not saved across page reloads.
