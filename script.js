// Constants and Initialization
const loginDialog = document.getElementsByTagName("dialog")[0];
const toastContainer = document.getElementById("toast-container");
const contentDiv = document.getElementById("content");
let token;

// Toast Notification System
function showToast(message, type = 'error') {
    const toast = document.createElement('div');
    toast.classList.add('toast', `toast-${type}`);
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('toast-exit');
        setTimeout(() => toastContainer.removeChild(toast), 500);
    }, 3000);
}

// Authentication
loginDialog.children.item(0).addEventListener("submit", async event => {
    event.preventDefault();
    try {
        const data = new FormData(event.target);
        const newToken = await getToken(data.get("user"), data.get("pass"));
        if (newToken && !newToken.startsWith("error:")) {
            token = newToken;
            await getData(token);
            loginDialog.close();
            event.target.reset();
            showToast('Login Successful', 'success');
        } else {
            showToast(newToken?.replace("error: ", "") || 'Login Failed');
        }
    } catch (error) {
        console.error(error);
        showToast('An unexpected error occurred');
    }
});

loginDialog.showModal();

function logOut() {
    contentDiv.innerHTML = "";
    loginDialog.showModal();
    showToast('Logged Out Successfully', 'success');
}

async function getToken(user, pass) {
    try {
        const response = await fetch(`https://learn.reboot01.com/api/auth/signin`, {
            method: "POST",
            headers: {
                Authorization: `basic ${btoa(user + ":" + pass)}`,
                Accept: 'application/json',
                'Content-Type': 'application/json'
            }
        });
        const newToken = await response.json();
        return newToken.error ? `error: ${newToken.error}` : newToken;
    } catch (error) {
        console.error(error);
        return `error: ${error}`;
    }
}

// Data Fetching
async function getData(token) {
    try {
        const response = await fetch(`https://learn.reboot01.com/api/graphql-engine/v1/graphql`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: `query {
                    user {
                        id, login, email, firstName, lastName, auditRatio,
                        progresses(where: {isDone: { _eq:true}}) {
                            createdAt, path, results { id, grade }
                        },
                        progressesByPath { count, createdAt, path, succeeded },
                        transactions(where: { type: {_ilike: "%skill%"}}) {
                            type, amount
                        },
                        xps { 
                            amount, path, 
                            event { createdAt }
                        },
                        audits(where:{auditedAt:{_is_null: false}}) {
                            id, auditedAt, grade, group { captainLogin, members { userLogin }}
                        }
                    }
                }`
            })
        });
        const json = await response.json();
        if (json.errors) {
            json.errors.forEach(error => showToast(error));
            return;
        }
        showData(json.data);
    } catch (error) {
        console.error(error);
        showToast('Failed to fetch data');
    }
}

function showData(data) {
    const user = data.user[0];
    contentDiv.innerHTML = '';
    
    const container = document.createElement('div');
    container.className = 'container';
    
    // Info Cards Section
    const cardsSection = createSection('cards-section');
    const cards = [
        {
            title: 'Basic Info',
            items: [
                ['Email', user.email],
                ['Username', user.login],
                ['Name', `${user.firstName} ${user.lastName}`],
                ['Audits Ratio', Math.round(user.auditRatio*100)/100]
            ]
        },
        {
            title: 'Progress Overview',
            items: [
                ['Total XP', humanSize(calculateTotalXP(user.xps))],
                ['Piscine XP', humanSize(calculatePiscineXP(user.xps))],
                ['Project XP', humanSize(calculateProjectXP(user.xps))]
            ]
        },
        {
            title: 'Audit Stats',
            items: [
                ['Total Audits', user.audits.length],
                ['Passes', user.audits.filter(a => a.grade >= 1).length],
                ['Fails', user.audits.filter(a => a.grade < 1).length]
            ]
        }
    ];
    
    cards.forEach(card => {
        cardsSection.appendChild(createCard(card.title, card.items));
    });
    container.appendChild(cardsSection);

    // Charts Section
    const chartsSection = createSection('charts-section');
    
    // Skills Radar Chart
    const skillsChartContainer = document.createElement('div');
    skillsChartContainer.className = 'chart-container';
    const skillsCanvas = document.createElement('canvas');
    skillsChartContainer.appendChild(skillsCanvas);

    // Process skills data
    const skillsData = processSkillsData(user.transactions);
    
    new Chart(skillsCanvas, {
        type: 'radar',
        data: {
            labels: Object.keys(skillsData),
            datasets: [{
                label: 'Skills',
                data: Object.values(skillsData),
                backgroundColor: 'rgba(0, 186, 173, 0.2)',
                borderColor: '#00baad',
                pointBackgroundColor: '#00baad',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#00baad'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Skills Distribution',
                    color: '#00baad',
                    font: { size: 16 }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                r: {
                    angleLines: {
                        color: 'rgba(255,255,255,0.1)'
                    },
                    grid: {
                        color: 'rgba(255,255,255,0.1)'
                    },
                    pointLabels: {
                        color: '#f5f5f5',
                        font: {
                            size: 12
                        }
                    },
                    ticks: {
                        color: '#f5f5f5',
                        backdropColor: 'transparent'
                    }
                }
            }
        }
    });

    // Audit Distribution Chart
    const auditChartContainer = document.createElement('div');
    auditChartContainer.className = 'chart-container';
    const auditCanvas = document.createElement('canvas');
    auditChartContainer.appendChild(auditCanvas);
    
    const passes = user.audits.filter(a => a.grade >= 1).length;
    const fails = user.audits.filter(a => a.grade < 1).length;

    new Chart(auditCanvas, {
        type: 'pie',
        data: {
            labels: ['Passes', 'Fails'],
            datasets: [{
                data: [passes, fails],
                backgroundColor: ['#4ecdc4', '#ff6b6b'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Audit Distribution',
                    color: '#00baad',
                    font: { size: 16 }
                },
                legend: {
                    position: 'bottom',
                    labels: { color: '#f5f5f5' }
                }
            }
        }
    });

    chartsSection.appendChild(skillsChartContainer);
    chartsSection.appendChild(auditChartContainer);
    container.appendChild(chartsSection);

    // Tables Section
    const tablesSection = createSection('tables-section');
    const progressTable = createTable(
        'Progress History',
        ['Path', 'XP', 'Grade'],
        user.progresses.map(p => [
            p.path,
            humanSize(getUserXPForPath(user.xps, p.path)),
            p.results[0]?.grade || '0'
        ])
    );
    const auditsTable = createTable(
        'Recent Audits',
        ['Date', 'Result', 'Group Members'],
        user.audits.map(a => [
            formatDate(a.auditedAt),
            a.grade >= 1 ? 'Pass' : 'Fail',
            formatGroupMembers(a.group)
        ])
    );
    tablesSection.appendChild(progressTable);
    tablesSection.appendChild(auditsTable);
    container.appendChild(tablesSection);

    contentDiv.appendChild(container);
}

// Utility Functions
function createSection(className) {
    const section = document.createElement('div');
    section.className = `section ${className}`;
    return section;
}

function createCard(title, items) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
        <div class="card-title">${title}</div>
        <div class="card-content">
            ${items.map(([label, value]) => `
                <div class="info-item">
                    <span>${label}:</span>
                    <span>${value}</span>
                </div>
            `).join('')}
        </div>
    `;
    return card;
}

function createTable(title, headers, rows) {
    const container = document.createElement('div');
    container.className = 'table-container';
    
    const titleElement = document.createElement('h3');
    titleElement.className = 'table-title';
    titleElement.textContent = title;
    container.appendChild(titleElement);

    const tableWrapper = document.createElement('div');
    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
            ${rows.map(row => `
                <tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>
            `).join('')}
        </tbody>
    `;
    tableWrapper.appendChild(table);
    container.appendChild(tableWrapper);
    return container;
}

function processSkillsData(transactions) {
    console.log(transactions)
    const skillsTotal = {};
    
    if (!transactions) return {};
    
    transactions.forEach(transaction => {
        const skillName = transaction.type.replace('skill_', '');
        skillsTotal[skillName] = (skillsTotal[skillName] || 0) + transaction.amount;
    });
    
    // Sort by total amount and take top skills
    const sortedSkills = Object.entries(skillsTotal)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .reduce((obj, [key, value]) => {
            obj[key] = value;
            return obj;
        }, {});
    console.log(sortedSkills)
    return sortedSkills;
}

function calculateTotalXP(xps) {
    return xps.reduce((sum, xp) => sum + xp.amount, 0);
}

function calculatePiscineXP(xps) {
    return xps.reduce((sum, xp) => sum + (xp.path.includes('piscine') ? xp.amount : 0), 0);
}

function calculateProjectXP(xps) {
    return xps.reduce((sum, xp) => sum + (!xp.path.includes('piscine') ? xp.amount : 0), 0);
}

function getUserXPForPath(xps, path) {
    return xps.filter(xp => xp.path === path)
        .reduce((sum, xp) => sum + xp.amount, 0);
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatGroupMembers(group) {
    if (!group || !group.members) return '';
    return group.members
        .map(m => m.userLogin === group.captainLogin ? 
             `<span class="captain">${m.userLogin}</span>` : 
             m.userLogin)
        .join(', ');
}

function humanSize(amount) {
    const units = ['B', 'KB', 'MB'];
    let size = amount;
    let unitIndex = 0;
    
    while (size >= 1000 && unitIndex < units.length - 1) {
        size /= 1000;
        unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
}