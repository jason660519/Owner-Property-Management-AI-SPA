const fs = require('fs');
const path = require('path');

// Configuration
const OUTPUT_DIR = __dirname;
const ANALYSIS_PATH = path.join(__dirname, 'project-packages-analysis/analysis.json');
const LEGACY_DIR = path.join(__dirname, 'legacy-dashboard');

// Read Data
const analysisData = JSON.parse(fs.readFileSync(ANALYSIS_PATH, 'utf8'));
let timelineData = [];

// Parse Legacy Dashboard for Timeline
try {
  const files = fs.readdirSync(LEGACY_DIR);
  const dateRegex = /(\d{4})(\d{2})(\d{2})/;
  
  files.forEach(file => {
    const match = file.match(dateRegex);
    if (match) {
      const dateStr = `${match[1]}-${match[2]}-${match[3]}`;
      timelineData.push({
        task: file.replace('.html', '').replace(/-/g, ' '),
        date: dateStr,
        link: `legacy-dashboard/${file}`
      });
    }
  });
  
  // Sort by date
  timelineData.sort((a, b) => new Date(a.date) - new Date(b.date));
} catch (e) {
  console.warn("Could not read legacy dashboard for timeline", e);
}

// Add some generic phases if timeline is empty
if (timelineData.length === 0) {
    timelineData = [
        { task: "Project Initialization", date: "2026-02-01", link: "#" },
        { task: "Core Architecture Setup", date: "2026-02-03", link: "#" },
        { task: "Package Analysis", date: "2026-02-06", link: "analysis.html" }
    ];
}

// Templates
const head = `
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Project Process Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
    <style>
        .nav-link { @apply px-4 py-2 rounded-md hover:bg-blue-700 transition; }
        .nav-link.active { @apply bg-blue-800 font-bold; }
        .card { @apply bg-white p-6 rounded-lg shadow-md border border-gray-200; }
    </style>
</head>
`;

const nav = (active) => `
<nav class="bg-blue-600 text-white p-4 shadow-lg">
    <div class="container mx-auto flex justify-between items-center">
        <h1 class="text-2xl font-bold">Project Process</h1>
        <div class="space-x-2">
            <a href="index.html" class="nav-link ${active === 'home' ? 'active' : ''}">Overview</a>
            <a href="timeline.html" class="nav-link ${active === 'timeline' ? 'active' : ''}">Timeline</a>
            <a href="analysis.html" class="nav-link ${active === 'analysis' ? 'active' : ''}">Package Analysis</a>
            <a href="legacy-dashboard/index.html" class="nav-link" target="_blank">Legacy Dashboard ↗</a>
        </div>
    </div>
</nav>
`;

const footer = `
<footer class="bg-gray-800 text-white p-6 mt-12">
    <div class="container mx-auto text-center">
        <p>Generated on ${new Date().toLocaleString()}</p>
        <p class="text-gray-400 text-sm mt-2">Owner Property Management AI SPA</p>
    </div>
</footer>
`;

// 1. Generate Index (Overview)
const generateIndex = () => {
    const alertsHtml = analysisData.alerts.map(alert => `
        <div class="p-4 mb-2 rounded border-l-4 ${
            alert.level === 'warning' ? 'bg-yellow-50 border-yellow-500 text-yellow-700' :
            alert.level === 'success' ? 'bg-green-50 border-green-500 text-green-700' :
            'bg-blue-50 border-blue-500 text-blue-700'
        }">
            <h4 class="font-bold uppercase text-xs">${alert.type}</h4>
            <p>${alert.message}</p>
        </div>
    `).join('');

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    ${head}
    <body class="bg-gray-50 text-gray-800">
        ${nav('home')}
        <main class="container mx-auto p-6 space-y-8">
            <header class="text-center py-10">
                <h2 class="text-4xl font-bold text-gray-900 mb-4">Project Overview</h2>
                <p class="text-xl text-gray-600">Development progress and system health monitoring.</p>
            </header>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div class="card text-center">
                    <h3 class="text-lg font-semibold text-gray-500">Total Packages</h3>
                    <p class="text-4xl font-bold text-blue-600">${analysisData.summary.totalPackages}</p>
                </div>
                <div class="card text-center">
                    <h3 class="text-lg font-semibold text-gray-500">Cloud Deps</h3>
                    <p class="text-4xl font-bold text-green-600">${analysisData.summary.environmentBreakdown.cloud_deployment}</p>
                </div>
                <div class="card text-center">
                    <h3 class="text-lg font-semibold text-gray-500">Dev Deps</h3>
                    <p class="text-4xl font-bold text-purple-600">${analysisData.summary.environmentBreakdown.development}</p>
                </div>
                <div class="card text-center">
                    <h3 class="text-lg font-semibold text-gray-500">Alerts</h3>
                    <p class="text-4xl font-bold text-yellow-600">${analysisData.alerts.length}</p>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div class="card">
                    <h3 class="text-xl font-bold mb-4">System Health & Alerts</h3>
                    ${alertsHtml}
                </div>
                <div class="card">
                    <h3 class="text-xl font-bold mb-4">Quick Actions</h3>
                    <ul class="space-y-3">
                        <li><a href="timeline.html" class="text-blue-600 hover:underline">→ View Development Roadmap</a></li>
                        <li><a href="analysis.html" class="text-blue-600 hover:underline">→ Inspect Package Dependencies</a></li>
                        <li><a href="legacy-dashboard/index.html" class="text-blue-600 hover:underline">→ Access Daily Reports</a></li>
                    </ul>
                </div>
            </div>
        </main>
        ${footer}
    </body>
    </html>
    `;
    fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), html);
};

// 2. Generate Timeline
const generateTimeline = () => {
    // Convert data to mermaid syntax
    const mermaidContent = `
    gantt
        title Project Development Timeline
        dateFormat YYYY-MM-DD
        axisFormat %m/%d
        
        section Reports
        ${timelineData.map(t => `${t.task} :${t.date}, 1d`).join('\n        ')}
    `;

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    ${head}
    <body class="bg-gray-50 text-gray-800">
        ${nav('timeline')}
        <main class="container mx-auto p-6">
            <h2 class="text-3xl font-bold mb-6">Development Progress (Gantt)</h2>
            <div class="card overflow-hidden">
                <div class="mermaid">
                    ${mermaidContent}
                </div>
            </div>
            
            <div class="mt-8">
                <h3 class="text-2xl font-bold mb-4">Timeline Events</h3>
                <div class="bg-white rounded-lg shadow overflow-hidden">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event / Task</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Link</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${timelineData.map(t => `
                            <tr>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${t.date}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${t.task}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-blue-600"><a href="${t.link}" target="_blank">View</a></td>
                            </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
        ${footer}
        <script>mermaid.initialize({startOnLoad:true});</script>
    </body>
    </html>
    `;
    fs.writeFileSync(path.join(OUTPUT_DIR, 'timeline.html'), html);
};

// 3. Generate Analysis (Network Graph)
const generateAnalysis = () => {
    // Collect all package data from actual package.json files
    const packageFiles = [
        { path: path.join(__dirname, '../package.json'), name: 'Monorepo Root' },
        { path: path.join(__dirname, '../apps/web/package.json'), name: 'apps/web' },
        { path: path.join(__dirname, '../apps/mobile/package.json'), name: 'apps/mobile' }
    ];

    let allPackages = [];

    packageFiles.forEach(pkg => {
        try {
            if (fs.existsSync(pkg.path)) {
                const content = JSON.parse(fs.readFileSync(pkg.path, 'utf8'));
                
                // Process dependencies
                if (content.dependencies) {
                    Object.entries(content.dependencies).forEach(([name, version]) => {
                        allPackages.push({
                            name,
                            version,
                            type: 'dependency',
                            location: pkg.name,
                            description: '', // Will try to fill from analysisData if available
                            environment: 'production'
                        });
                    });
                }

                // Process devDependencies
                if (content.devDependencies) {
                    Object.entries(content.devDependencies).forEach(([name, version]) => {
                        allPackages.push({
                            name,
                            version,
                            type: 'devDependency',
                            location: pkg.name,
                            description: '',
                            environment: 'development'
                        });
                    });
                }
            }
        } catch (e) {
            console.warn(`Error reading package.json at ${pkg.path}`, e);
        }
    });

    // Merge with analysisData for descriptions and specific environment tags if available
    allPackages = allPackages.map(p => {
        const existing = analysisData.packages.find(ep => ep.name === p.name && (ep.location === p.location || ep.location === 'root'));
        return {
            ...p,
            description: existing ? existing.description : '',
            environment: existing ? existing.environment : (p.type === 'devDependency' ? 'development' : 'production')
        };
    });


    // Read Table Sorting Logic
    const tableSortLogic = fs.readFileSync(path.join(__dirname, 'js/table-sort.js'), 'utf8');

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    ${head}
    <body class="bg-gray-50 text-gray-800">
        ${nav('analysis')}
        <main class="container mx-auto p-6 space-y-8">
            <h2 class="text-3xl font-bold">Package Dependency Analysis</h2>
            
            <!-- Package Table (Moved to Top) -->
            <div class="card">
                <div class="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                    <h3 class="text-xl font-bold">Detailed Package List</h3>
                    <div class="flex flex-wrap gap-2">
                        <input type="text" id="searchInput" placeholder="Search packages..." class="border rounded px-3 py-1 text-sm w-full md:w-auto">
                        <select id="typeFilter" class="border rounded px-3 py-1 text-sm">
                            <option value="all">All Types</option>
                            <option value="dependency">Dependency</option>
                            <option value="devDependency">DevDependency</option>
                        </select>
                        <select id="locationFilter" class="border rounded px-3 py-1 text-sm">
                            <option value="all">All Locations</option>
                            <option value="Monorepo Root">Root</option>
                            <option value="apps/web">Web</option>
                            <option value="apps/mobile">Mobile</option>
                        </select>
                    </div>
                </div>
                
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200" id="packageTable">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none group" data-sortable="true" data-type="string" data-column="package">
                                    Package <span class="sort-icon ml-1 text-gray-400">↕</span>
                                </th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none group" data-sortable="true" data-type="version" data-column="version">
                                    Version <span class="sort-icon ml-1 text-gray-400">↕</span>
                                </th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none group" data-sortable="true" data-type="string" data-column="type">
                                    Type <span class="sort-icon ml-1 text-gray-400">↕</span>
                                </th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none group" data-sortable="true" data-type="string" data-column="location">
                                    Location <span class="sort-icon ml-1 text-gray-400">↕</span>
                                </th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none group" data-sortable="true" data-type="string" data-column="env">
                                    Env <span class="sort-icon ml-1 text-gray-400">↕</span>
                                </th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none group" data-sortable="true" data-type="string" data-column="description">
                                    Description <span class="sort-icon ml-1 text-gray-400">↕</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${allPackages.map(p => `
                            <tr class="package-row" data-name="${p.name.toLowerCase()}" data-type="${p.type}" data-location="${p.location}">
                                <td class="px-6 py-4 text-sm font-bold text-gray-900" data-value="${p.name}">${p.name}</td>
                                <td class="px-6 py-4 text-sm text-gray-500 font-mono" data-value="${p.version}">${p.version}</td>
                                <td class="px-6 py-4 text-sm text-gray-500" data-value="${p.type}">
                                    <span class="px-2 py-1 rounded-full text-xs ${p.type === 'dependency' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}">
                                        ${p.type}
                                    </span>
                                </td>
                                <td class="px-6 py-4 text-sm text-gray-500" data-value="${p.location}">${p.location}</td>
                                <td class="px-6 py-4 text-sm text-gray-500" data-value="${p.environment}">
                                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                        ${p.environment === 'development' ? 'bg-gray-100 text-gray-800' : 
                                          p.environment === 'production' ? 'bg-green-100 text-green-800' : 
                                          'bg-blue-100 text-blue-800'}">
                                        ${p.environment}
                                    </span>
                                </td>
                                <td class="px-6 py-4 text-sm text-gray-500 italic" data-value="${p.description || ''}">${p.description || '-'}</td>
                            </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div id="noResults" class="hidden text-center py-4 text-gray-500">No packages found matching criteria</div>
                </div>
            </div>

            <!-- Network Graph (Moved to Bottom) -->
            <div class="card h-[600px] flex flex-col">
                <h3 class="text-xl font-bold mb-4">Interactive Dependency Network</h3>
                <div id="mynetwork" class="flex-grow border border-gray-100 rounded bg-gray-50"></div>
                <p class="text-sm text-gray-500 mt-2">Drag nodes to rearrange. Zoom to inspect.</p>
            </div>
        </main>
        ${footer}
        <script>
            // Data from JSON for Graph
            var nodes = new vis.DataSet(${JSON.stringify(analysisData.graph.nodes.map(n => ({id: n.id, label: n.id, group: n.group})))});
            var edges = new vis.DataSet(${JSON.stringify(analysisData.graph.links.map(l => ({from: l.source, to: l.target})))});

            var container = document.getElementById('mynetwork');
            var data = { nodes: nodes, edges: edges };
            var options = {
                nodes: {
                    shape: 'dot',
                    size: 20,
                    font: { size: 16 }
                },
                groups: {
                    root: { color: 'red', size: 30 },
                    app: { color: 'orange', size: 25 },
                    lib: { color: '#97C2FC' },
                    tool: { color: '#FFFF00' }
                },
                physics: {
                    stabilization: false,
                    barnesHut: { gravitationalConstant: -2000 }
                }
            };
            var network = new vis.Network(container, data, options);

            // Table Filter & Search Logic
            const searchInput = document.getElementById('searchInput');
            const typeFilter = document.getElementById('typeFilter');
            const locationFilter = document.getElementById('locationFilter');
            const tableRows = document.querySelectorAll('.package-row');
            const noResults = document.getElementById('noResults');

            function filterTable() {
                const searchTerm = searchInput.value.toLowerCase();
                const typeValue = typeFilter.value;
                const locationValue = locationFilter.value;
                let visibleCount = 0;

                tableRows.forEach(row => {
                    const name = row.dataset.name;
                    const type = row.dataset.type;
                    const location = row.dataset.location;

                    const matchesSearch = name.includes(searchTerm);
                    const matchesType = typeValue === 'all' || type === typeValue;
                    const matchesLocation = locationValue === 'all' || location === locationValue;

                    if (matchesSearch && matchesType && matchesLocation) {
                        row.style.display = '';
                        visibleCount++;
                    } else {
                        row.style.display = 'none';
                    }
                });

                noResults.classList.toggle('hidden', visibleCount > 0);
            }

            searchInput.addEventListener('input', filterTable);
            typeFilter.addEventListener('change', filterTable);
            locationFilter.addEventListener('change', filterTable);

            // --- Enhanced Sorting Logic Injected Below ---
            
            ${tableSortLogic}
            
            // Initialize Sorting
            document.addEventListener('DOMContentLoaded', () => {
                new TableManager('packageTable');
            });
        </script>
    </body>
    </html>
    `;
    fs.writeFileSync(path.join(OUTPUT_DIR, 'analysis.html'), html);
};

// 4. Generate Offline Single File
const generateSingleFile = () => {
    // Simplified version for single file
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    ${head}
    <body class="bg-gray-50 text-gray-800 p-8">
        <div class="max-w-4xl mx-auto space-y-12">
            <header class="text-center">
                <h1 class="text-4xl font-bold">Project Process - Offline Report</h1>
                <p class="text-gray-500">Generated on ${new Date().toLocaleString()}</p>
            </header>
            
            <section class="card">
                <h2 class="text-2xl font-bold mb-4">Overview</h2>
                <div class="grid grid-cols-2 gap-4">
                     <div>Total Packages: <strong>${analysisData.summary.totalPackages}</strong></div>
                     <div>Alerts: <strong>${analysisData.alerts.length}</strong></div>
                </div>
            </section>

            <section class="card">
                <h2 class="text-2xl font-bold mb-4">Development Timeline</h2>
                <ul>
                    ${timelineData.map(t => `<li class="border-b py-2 flex justify-between"><span>${t.task}</span> <span class="text-gray-500">${t.date}</span></li>`).join('')}
                </ul>
            </section>

            <section class="card">
                <h2 class="text-2xl font-bold mb-4">Package Analysis</h2>
                <pre class="bg-gray-100 p-4 rounded text-sm overflow-auto">${JSON.stringify(analysisData.packages, null, 2)}</pre>
            </section>
        </div>
    </body>
    </html>
    `;
    fs.writeFileSync(path.join(OUTPUT_DIR, 'offline-report.html'), html);
}

// Execute
console.log('Building Project Process Site...');
generateIndex();
generateTimeline();
generateAnalysis();
generateSingleFile();
console.log('Build Complete. Files generated in project-process/');
