// ============================================================
// Testbook Search: Find all "Socio Religious" tests
// ============================================================
// Searches across the entire Testbook platform
// ============================================================

const AUTH_TOKEN = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3Rlc3Rib29rLmNvbSIsInN1YiI6IjVlMzNlZTg2NGI2NTJjMGQxMDkzMjYyZCIsImF1ZCI6IlRCIiwiZXhwIjoiMjAyNi0wMy0yOVQwODowOTo0MS44OTIyMjEzNDFaIiwiaWF0IjoiMjAyNi0wMi0yN1QwODowOTo0MS44OTIyMjEzNDFaIiwibmFtZSI6Ik9tIHdhbWFuIiwiZW1haWwiOiJvbXdhbWFuMUBnbWFpbC5jb20iLCJvcmdJZCI6IiIsImhvbWVTdGF0ZUlkIjoiNWY5MTYzYTQyZWM4MjdiMjE4ZGFjZDI5IiwiaXNMTVNVc2VyIjpmYWxzZSwicm9sZXMiOiJzdHVkZW50In0.wfK6yGb3AE_JsSj-KnxYDQUCWvjHBH-5hQ_j1qsQRXkhrzVCiRjb1D4NuNZbr52XYef6gq4F6SyQcQEp2ltQdj8D0Jgj6P4qETzT0SQv6-f2RDgjyngZIRaBK6ruwRSiHfo0L5oQAYBKIpGAfodOKdFzTwOSJNOFX_392zu_xtc";

async function apiFetch(url) {
    const headers = {
        source: "testbook",
        origin: "https://testbook.com",
        referer: "https://testbook.com/",
        accept: "application/json",
        authorization: `Bearer ${AUTH_TOKEN}`,
        "x-tb-client": "web,1.2",
    };
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
}

// Search approach 1: Testbook search API
async function searchTestbook(query) {
    console.log(`\n🔍 Searching Testbook for: "${query}"\n`);
    
    const searchUrls = [
        `https://api.testbook.com/api/v1/search?query=${encodeURIComponent(query)}&type=test-series`,
        `https://api.testbook.com/api/v2/search?query=${encodeURIComponent(query)}&type=test-series`,
        `https://api.testbook.com/api/v1/search?query=${encodeURIComponent(query)}`,
        `https://api.testbook.com/api/v2/search?query=${encodeURIComponent(query)}`,
        `https://api-new.testbook.com/api/v1/search?query=${encodeURIComponent(query)}&auth_code=${AUTH_TOKEN}`,
        `https://api-new.testbook.com/api/v2/search?query=${encodeURIComponent(query)}&auth_code=${AUTH_TOKEN}`,
        `https://api.testbook.com/api/v1/super-search?query=${encodeURIComponent(query)}`,
        `https://api.testbook.com/api/v2/super-search?query=${encodeURIComponent(query)}`,
    ];

    for (const url of searchUrls) {
        try {
            console.log(`  Trying: ${url.substring(0, 80)}...`);
            const data = await apiFetch(url);
            if (data) {
                console.log(`  ✅ Got response!`);
                console.log(JSON.stringify(data, null, 2).substring(0, 3000));
                console.log("\n---\n");
            }
        } catch (e) {
            console.log(`  ❌ ${e.message}`);
        }
    }
}

// Search approach 2: Look at the website's test series listing pages
async function searchTestSeriesListing() {
    console.log(`\n📋 Fetching test series listings...\n`);
    
    const listUrls = [
        `https://api.testbook.com/api/v1/test-series?skip=0&limit=50`,
        `https://api.testbook.com/api/v2/test-series?skip=0&limit=50`,
        `https://api.testbook.com/api/v1/test-series/list?skip=0&limit=50`,
        `https://api-new.testbook.com/api/v1/test-series?skip=0&limit=50&auth_code=${AUTH_TOKEN}`,
    ];

    for (const url of listUrls) {
        try {
            console.log(`  Trying: ${url.substring(0, 80)}...`);
            const data = await apiFetch(url);
            if (data) {
                console.log(`  ✅ Got response!`);
                console.log(JSON.stringify(data, null, 2).substring(0, 3000));
                console.log("\n---\n");
            }
        } catch (e) {
            console.log(`  ❌ ${e.message}`);
        }
    }
}

// Search approach 3: Testbook website autocomplete/suggest API
async function searchSuggest(query) {
    console.log(`\n💡 Trying suggest/autocomplete APIs for: "${query}"\n`);
    
    const suggestUrls = [
        `https://api.testbook.com/api/v1/suggest?query=${encodeURIComponent(query)}`,
        `https://api.testbook.com/api/v2/suggest?query=${encodeURIComponent(query)}`,
        `https://api.testbook.com/api/v1/auto-suggest?query=${encodeURIComponent(query)}`,
        `https://api-new.testbook.com/api/v1/suggest?query=${encodeURIComponent(query)}&auth_code=${AUTH_TOKEN}`,
        `https://api.testbook.com/api/v1/global-search?query=${encodeURIComponent(query)}`,
        `https://api.testbook.com/api/v2/global-search?query=${encodeURIComponent(query)}`,
    ];

    for (const url of suggestUrls) {
        try {
            console.log(`  Trying: ${url.substring(0, 80)}...`);
            const data = await apiFetch(url);
            if (data) {
                console.log(`  ✅ Got response!`);
                console.log(JSON.stringify(data, null, 2).substring(0, 3000));
                console.log("\n---\n");
            }
        } catch (e) {
            console.log(`  ❌ ${e.message}`);
        }
    }
}

// Search approach 4: Directly check the Testbook test-series page for socio religious
async function checkKnownSeries() {
    console.log(`\n📚 Checking known Maharashtra exam test series for socio-religious sections...\n`);
    
    const knownSlugs = [
        "maharashtra-talathi",
        "maharashtra-mpsc-state-service-prelims",
        "maharashtra-police-constable",
        "maharashtra-gramsevak",
        "maharashtra-lipik-typist",
        "maharashtra-arogya-vibhag-group-d",
        "maharashtra-zilla-parishad",
        "mpsc-combined-exam",
        "mpsc-rajyaseva",
        "mpsc-group-b",
        "mpsc-group-c",
        "maharashtra-mega-combo",
        "maharashtra-sti",
        "maharashtra-psi",
        "maharashtra-aso",
        "mega-maharashtra-combo",
    ];
    
    const proj = JSON.stringify({
        details: { id: 1, name: 1, sections: { id: 1, name: 1, subsections: { id: 1, name: 1, paidTestCount: 1, freeTestCount: 1 }, paidTestCount: 1, freeTestCount: 1 } },
    });
    
    const socioKeywords = ["socio", "religious", "reform", "सामाजिक", "धार्मिक", "सुधारणा", "चळवळ"];
    
    for (const slug of knownSlugs) {
        try {
            console.log(`  Checking: ${slug}...`);
            const data = await apiFetch(`https://api.testbook.com/api/v1/test-series/slug?__projection=${encodeURIComponent(proj)}&url=${slug}&branchId=&language=English`);
            if (data.success) {
                const seriesName = data.data.details.name;
                const seriesId = data.data.details.id;
                const sections = data.data.details.sections || [];
                
                for (const sec of sections) {
                    const secNameLower = sec.name.toLowerCase();
                    const hasSocioInSection = socioKeywords.some(k => secNameLower.includes(k.toLowerCase()));
                    
                    if (hasSocioInSection) {
                        console.log(`\n  ✅ FOUND in "${seriesName}" (${slug})`);
                        console.log(`     Series ID: ${seriesId}`);
                        console.log(`     Section: ${sec.name} (ID: ${sec.id})`);
                        if (sec.subsections) {
                            for (const sub of sec.subsections) {
                                console.log(`       └─ ${sub.name} (ID: ${sub.id}) [${sub.paidTestCount || 0} paid, ${sub.freeTestCount || 0} free]`);
                            }
                        }
                    }
                    
                    // Also check subsections
                    if (sec.subsections) {
                        for (const sub of sec.subsections) {
                            const subNameLower = sub.name.toLowerCase();
                            const hasSocioInSub = socioKeywords.some(k => subNameLower.includes(k.toLowerCase()));
                            if (hasSocioInSub && !hasSocioInSection) {
                                console.log(`\n  ✅ FOUND in "${seriesName}" (${slug})`);
                                console.log(`     Series ID: ${seriesId}`);
                                console.log(`     Section: ${sec.name} (ID: ${sec.id})`);
                                console.log(`       └─ ${sub.name} (ID: ${sub.id}) [${sub.paidTestCount || 0} paid, ${sub.freeTestCount || 0} free]`);
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.log(`    ❌ ${slug}: ${e.message}`);
        }
    }
}

async function main() {
    console.log("=============================================");
    console.log("  Testbook: SOCIO RELIGIOUS Test Finder");
    console.log("=============================================");

    // Try all search approaches
    await searchTestbook("socio religious");
    await searchSuggest("socio religious");
    await searchTestSeriesListing();
    await checkKnownSeries();
    
    console.log("\n\n✅ Search complete!");
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
