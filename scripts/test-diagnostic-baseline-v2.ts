import { BASELINE_BLUEPRINT, BASELINE_SIZE, BASELINE_SOURCE, BASELINE_VERSION, BASELINE_WRITING_TASK, baselineWordCount, scoreBaselineWriting } from "@/lib/assessment/diagnostic-baseline";

let passed=0; let failed=0;
function check(name:string, fn:()=>boolean){ try{ if(fn()){passed++;console.log("✓",name);} else {failed++;console.log("✗",name);} } catch(error){failed++;console.log("✗",name,error instanceof Error?error.message:error);} }

check("baseline version canonical",()=>BASELINE_VERSION==="2.0");
check("baseline source isolated",()=>BASELINE_SOURCE==="DIAGNOSTIC_BASELINE_V2");
check("baseline has 12 objective items",()=>BASELINE_SIZE===12);
check("five competencies represented",()=>BASELINE_BLUEPRINT.length===4 && ["READING","GRAMMAR","VOCABULARY","LITERATURE"].every(x=>BASELINE_BLUEPRINT.some(item=>item.skill===x)) && BASELINE_SKILLS.includes("WRITING"));
check("objective blueprint matches live safe-bank distribution",()=>JSON.stringify(BASELINE_BLUEPRINT)===JSON.stringify([{skill:"READING",count:2},{skill:"GRAMMAR",count:3},{skill:"VOCABULARY",count:3},{skill:"LITERATURE",count:2}]));
check("blueprint covers 12 core objective slots",()=>BASELINE_BLUEPRINT.reduce((n,x)=>n+x.count,0)===12);
check("baseline objective blueprint matches available safe bank",()=>BASELINE_SIZE===12 && BASELINE_BLUEPRINT.reduce((n,x)=>n+x.count,0)===12);
check("writing task exists",()=>BASELINE_WRITING_TASK.minWords>=80&&BASELINE_WRITING_TASK.maxWords>=BASELINE_WRITING_TASK.minWords);
check("writing rubric has multiple dimensions",()=>BASELINE_WRITING_TASK.rubric.length>=5);
check("word counter handles whitespace",()=>baselineWordCount(" satu\n dua   tiga ")===3);

const weak=scoreBaselineWriting("Aku pergi. Selesai.");
check("short writing produces a bounded signal",()=>weak.score>=0&&weak.score<=1);
check("short writing is not falsely strong",()=>weak.level!=="KUAT");

const strong=scoreBaselineWriting("Kemarin saya menemukan buku lama di perpustakaan sekolah. Saya membukanya karena sampulnya menarik. Kemudian saya membaca beberapa halaman dan menemukan cerita tentang seorang anak yang berani menolong temannya. Saya merasa cerita itu menarik karena tokohnya belajar dari kesalahan. Setelah membaca, saya memahami bahwa keberanian tidak selalu berarti tidak takut, tetapi tetap bertindak ketika sesuatu memang penting. Saya ingin membawa pelajaran itu ke kebiasaan saya sehari-hari agar tidak hanya berhenti sebagai cerita yang saya baca. Sejak itu saya mencoba lebih berani mengambil keputusan kecil yang bermanfaat bagi orang lain.");
check("adequate writing produces a bounded signal",()=>strong.score>=0&&strong.score<=1);
check("adequate writing has enough words",()=>strong.wordCount>=BASELINE_WRITING_TASK.minWords);
check("writing dimensions are bounded",()=>Object.values(strong.dimensions).every(v=>v>=0&&v<=1));

const fs=require("fs");
const route=fs.readFileSync("app/api/player/diagnostic/baseline/route.ts","utf8");
const ui=fs.readFileSync("app/(dashboard)/murid/tes-awal/page.tsx","utf8");
const mentor=fs.readFileSync("lib/ai-gateway/mentor-context.ts","utf8");
const adaptiveHome=fs.readFileSync("app/api/player/adaptive-practice/route.ts","utf8");
const hero=fs.readFileSync("components/student-home/StudentHomeHero.tsx","utf8");
check("baseline route does not depend on Jalur Cerdas",()=>!route.includes("/arena/jalur-cerdas")&&!route.includes("selectAdaptivePractice"));
check("Tes Awal UI uses baseline endpoint",()=>ui.includes("/api/player/diagnostic/baseline")&&!ui.includes("/api/player/diagnostic/daily"));
check("baseline route has writing action",()=>route.includes('action === "writing"'));
check("baseline route persists LearningEvidence",()=>route.includes("upsertLearningEvidence"));
check("baseline route is server-authoritative",()=>route.includes("db.soal.findUnique")&&route.includes("correctAnswer"));
check("baseline has no XP reward",()=>!route.includes("awardXp")&&!route.includes("addCoin"));
check("Mentor consumes baseline evidence",()=>mentor.includes('e.source === "DIAGNOSTIC_BASELINE_V2"'));
check("home preview recognizes baseline before adaptive practice",()=>adaptiveHome.includes("BASELINE_SOURCE")&&adaptiveHome.includes('actionType: "DIAGNOSTIC"')&&adaptiveHome.includes('assessmentState: "BASELINE_AVAILABLE"'));
check("home hero no longer starts legacy diagnostic route",()=>!hero.includes('fetch("/api/player/diagnostic"')&&!hero.includes("/arena/diagnostic/")&&hero.includes('router.push("/murid/tes-awal")'));

console.log("Hasil: "+passed+" lulus, "+failed+" gagal");
if(failed>0)process.exit(1);