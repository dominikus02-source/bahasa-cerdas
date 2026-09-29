"use client";

type CityCahayaStageProps = {
  progressPercent: number;
  unlockedMilestones: string[];
};

const normalizeMilestone = (value: string) => {
  const aliases: Record<string, string> = {
    garden: 'garden', taman: 'garden',
    library: 'library', perpus: 'library', perpustakaan: 'library',
    homes: 'homes', rumah: 'homes',
    'town-center': 'town-center', pusat: 'town-center', 'pusat-kota': 'town-center',
  };
  return aliases[value.toLowerCase().trim()] ?? value.toLowerCase().trim();
};

export function CityCahayaStage({ progressPercent, unlockedMilestones }: CityCahayaStageProps) {
  const unlocked = new Set(unlockedMilestones.map(normalizeMilestone));
  const value = Math.max(0, Math.min(100, Math.round(progressPercent)));
  const on = (key: string) => unlocked.has(key);

  return (
    <section className="mb-city-stage" aria-label={'Kota Cahaya ' + value + ' persen'}>
      <div className="mb-city-stage-top">
        <div><span className="mb-city-stage-eyebrow">KOTA CAHAYA</span><h3>Bangun kota bersama kelas</h3></div>
        <strong>{value}%</strong>
      </div>
      <div className="mb-city-stage-art">
        <svg viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Ilustrasi Kota Cahaya">
          <defs>
            <linearGradient id="citySky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#071426"/><stop offset=".55" stopColor="#0B1D31"/><stop offset="1" stopColor="#123049"/></linearGradient>
            <linearGradient id="cityAurora" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#1E5A54" stopOpacity="0"/><stop offset=".5" stopColor="#1E5A54" stopOpacity=".33"/><stop offset="1" stopColor="#1E5A54" stopOpacity="0"/></linearGradient>
            <radialGradient id="cityHalo"><stop offset="0" stopColor="#EFE6C8" stopOpacity=".28"/><stop offset="1" stopColor="#EFE6C8" stopOpacity="0"/></radialGradient>
            <radialGradient id="cityGlow"><stop offset="0" stopColor="#FFD57A" stopOpacity=".55"/><stop offset="1" stopColor="#FFD57A" stopOpacity="0"/></radialGradient>
            <linearGradient id="cityGround" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#12314E"/><stop offset="1" stopColor="#0A1C2E"/></linearGradient>
          </defs>
          <rect width="1200" height="600" fill="url(#citySky)"/>
          <path className="mb-city-aurora" d="M-40 170 C200 70 460 150 700 90 C900 45 1080 110 1240 60 L1240 -20 L-40 -20 Z" fill="url(#cityAurora)"/>
          {Array.from({length:46},(_,i)=><circle key={i} className={i%5===0?'mb-city-twinkle':''} cx={10+((i*97)%1180)} cy={8+((i*53)%282)} r={0.7+((i*17)%10)/10} fill="#DCE9F5" opacity={0.3+((i*13)%55)/100}/>)}
          <circle cx="150" cy="88" r="78" fill="url(#cityHalo)"/><circle cx="150" cy="88" r="27" fill="#EFE6C8" opacity=".94"/><circle cx="142" cy="81" r="5" fill="#E3D8B2" opacity=".8"/><circle cx="159" cy="96" r="3.4" fill="#E3D8B2" opacity=".7"/>
          <path d="M-20 372 L190 292 L400 352 L640 278 L880 348 L1100 292 L1220 330 L1220 600 L-20 600 Z" fill="#0E2036"/>

          <g className={on('garden')?'mb-city-landmark is-on':'mb-city-landmark'}>
            <rect className="mb-city-glow" x="120" y="400" width="240" height="120" fill="url(#cityGlow)"/><ellipse cx="235" cy="512" rx="105" ry="16" fill="#0C2438"/><ellipse className="mb-city-shimmer" cx="205" cy="510" rx="34" ry="4" fill="#9CC8E8" opacity=".3"/><ellipse className="mb-city-shimmer" cx="272" cy="516" rx="26" ry="3.4" fill="#9CC8E8" opacity=".25"/>
            <circle cx="120" cy="452" r="34" fill="#14395A"/><circle cx="172" cy="462" r="26" fill="#14395A"/><circle cx="300" cy="458" r="29" fill="#14395A"/><line x1="205" y1="512" x2="205" y2="470" stroke="#1E425F" strokeWidth="4"/><circle className="mb-city-lamp" cx="205" cy="464" r="15" fill="url(#cityGlow)"/><circle cx="205" cy="464" r="6" fill="#FFD57A"/><line x1="282" y1="514" x2="282" y2="482" stroke="#1E425F" strokeWidth="3.5"/><circle className="mb-city-lamp" cx="282" cy="476" r="13" fill="url(#cityGlow)"/><circle cx="282" cy="476" r="5" fill="#FFD57A"/>
            <rect x="228" y="500" width="52" height="6" rx="3" fill="#1E425F"/><rect x="232" y="506" width="5" height="9" fill="#1E425F"/><rect x="270" y="506" width="5" height="9" fill="#1E425F"/><text x="235" y="548" textAnchor="middle" className="mb-city-label">TAMAN</text>
            
          </g>

          <g className={on('library')?'mb-city-landmark is-on':'mb-city-landmark'}>
            <rect className="mb-city-glow" x="360" y="300" width="240" height="200" fill="url(#cityGlow)"/><rect x="380" y="372" width="190" height="138" fill="#10283F" stroke="#1D436B" strokeWidth="1.5"/><path d="M366 372 L475 318 L584 372 Z" fill="#143352" stroke="#1D436B" strokeWidth="1.5"/><circle cx="475" cy="306" r="17" fill="#143352"/><Window x="467" y="330" width="16" height="14"/>
            {Array.from({length:8},(_,i)=><Window key={i} x={404+(i%4)*44} y={396+Math.floor(i/4)*50} width="26" height="32"/>)}
            <rect x="445" y="470" width="60" height="40" fill="#0C2033"/><rect x="390" y="510" width="170" height="8" rx="3" fill="#0E2540"/><rect x="400" y="502" width="150" height="8" rx="3" fill="#0E2540"/><text x="475" y="360" textAnchor="middle" className="mb-city-label">PERPUSTAKAAN</text>
            
          </g>

          <g className={on('homes')?'mb-city-landmark is-on':'mb-city-landmark'}>
            <rect className="mb-city-glow" x="600" y="380" width="290" height="140" fill="url(#cityGlow)"/><rect x="620" y="438" width="86" height="72" fill="#10283F" stroke="#1D436B" strokeWidth="1.4"/><path d="M612 438 L663 404 L714 438 Z" fill="#143352"/><rect x="688" y="412" width="9" height="20" fill="#12304A"/><Window x="632" y="452" width="17" height="15"/><Window x="677" y="452" width="17" height="15"/><Window x="651" y="480" width="22" height="30"/>
            <rect x="724" y="406" width="72" height="104" fill="#10283F" stroke="#1D436B" strokeWidth="1.4"/><path d="M716 406 L760 372 L804 406 Z" fill="#143352"/><Window x="736" y="420" width="15" height="14"/><Window x="764" y="420" width="15" height="14"/><Window x="736" y="450" width="15" height="14"/><Window x="764" y="450" width="15" height="14"/><Window x="736" y="480" width="15" height="14"/><Window x="764" y="480" width="15" height="14"/>
            <rect x="812" y="446" width="72" height="64" fill="#10283F" stroke="#1D436B" strokeWidth="1.4"/><path d="M804 446 L848 416 L892 446 Z" fill="#143352"/><Window x="826" y="462" width="16" height="14"/><Window x="856" y="462" width="16" height="14"/><Window x="826" y="490" width="16" height="14"/><text x="756" y="548" textAnchor="middle" className="mb-city-label">RUMAH</text>
            
          </g>

          <g className={on('town-center')?'mb-city-landmark is-on':'mb-city-landmark'}>
            <rect className="mb-city-glow" x="905" y="150" width="180" height="330" fill="url(#cityGlow)"/><rect x="980" y="252" width="110" height="250" fill="#112B45" stroke="#1D436B" strokeWidth="1.5"/><path d="M970 252 L1035 196 L1100 252 Z" fill="#16395B"/><line x1="1035" y1="196" x2="1035" y2="156" stroke="#1E4A6E" strokeWidth="3.5" strokeLinecap="round"/><circle className="mb-city-lamp" cx="1035" cy="150" r="17" fill="url(#cityGlow)"/><circle cx="1035" cy="150" r="6.5" fill="#FFD57A"/>
            {Array.from({length:21},(_,i)=><Window key={i} x={994+(i%3)*27} y={266+Math.floor(i/3)*31} width="17" height="17"/>)}
            <rect x="920" y="338" width="62" height="164" fill="#10283F" stroke="#1D436B" strokeWidth="1.4"/>{Array.from({length:8},(_,i)=><Window key={i} x={932+(i%2)*25} y={352+Math.floor(i/2)*30} width="14" height="13"/>)}
            <rect x="1094" y="368" width="58" height="134" fill="#10283F" stroke="#1D436B" strokeWidth="1.4"/><Window x="1104" y="382" width="14" height="13"/><Window x="1128" y="382" width="14" height="13"/><Window x="1104" y="412" width="14" height="13"/><Window x="1128" y="412" width="14" height="13"/><rect x="1022" y="468" width="28" height="34" fill="#0C2033"/><text x="1035" y="548" textAnchor="middle" className="mb-city-label">PUSAT KOTA</text>
            
          </g>

          <rect y="528" width="1200" height="72" fill="url(#cityGround)"/><line x1="0" y1="528" x2="1200" y2="528" stroke="#173A5B" strokeWidth="2"/><ellipse className="mb-city-shimmer" cx="150" cy="552" rx="60" ry="5" fill="#EFE6C8" opacity=".22"/><ellipse className="mb-city-shimmer" cx="920" cy="566" rx="44" ry="4" fill="#9CC8E8" opacity=".16"/>
        </svg>
      </div>
      <div className="mb-city-stage-progress" aria-hidden="true"><span style={{width:value+'%'}}/></div>
      <p className="mb-city-stage-caption">{unlocked.size} dari 4 bagian kota menyala · setiap jawaban benar membantu membangun Kota Cahaya.</p>
      <style>{`
        .mb-city-stage{width:min(100%,1100px);margin:18px auto 0;padding:18px 20px 16px;border-radius:26px;color:#EAF2F9;background:#081726;box-shadow:0 24px 56px rgba(8,23,38,.2);overflow:hidden}
        .mb-city-stage-top{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;padding:2px 6px 12px}
        .mb-city-stage-eyebrow{color:#0FA8A0;font-size:.68rem;font-weight:900;letter-spacing:.14em}
        .mb-city-stage h3{margin:4px 0 0;font-size:clamp(1rem,2vw,1.35rem)}
        .mb-city-stage-top strong{color:#FFD57A;font-size:clamp(1.45rem,3vw,2rem)}
        .mb-city-stage-art{width:100%;border-radius:20px;overflow:hidden;background:#0B1D31;border:1px solid rgba(255,255,255,.07)}
        .mb-city-stage-art svg{display:block;width:100%;height:auto;min-height:250px}
        .mb-city-landmark .mb-city-glow{opacity:.04;transition:opacity .7s ease}
        .mb-city-landmark.is-on .mb-city-glow{opacity:.48}
        .mb-city-window{fill:#1E3F60;transition:fill .55s ease,filter .55s ease}
        .mb-city-landmark.is-on .mb-city-window{fill:#FFD57A;filter:drop-shadow(0 0 4px rgba(255,213,122,.48))}
        .mb-city-lamp{opacity:.08;transition:opacity .7s ease}
        .mb-city-landmark.is-on .mb-city-lamp{opacity:.75}
        .mb-city-label{fill:#6E8AA3;font:800 12px "Plus Jakarta Sans",sans-serif;letter-spacing:2.2px;transition:fill .55s ease}
        .mb-city-landmark.is-on .mb-city-label{fill:#FFD57A}
        .mb-city-shimmer{animation:mbCityShimmer 7s ease-in-out infinite}
        .mb-city-aurora{animation:mbCityAurora 11s ease-in-out infinite}
        .mb-city-twinkle{animation:mbCityTwinkle 4s ease-in-out infinite}
        .mb-city-ring{fill:none;stroke:#FFD57A;stroke-width:3;animation:mbCityRing 1.3s ease-out forwards;transform-box:fill-box;transform-origin:center}
        .mb-city-stage-progress{height:7px;margin:12px 2px 0;border-radius:999px;overflow:hidden;background:rgba(255,255,255,.08)}
        .mb-city-stage-progress span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#0FA8A0,#8CE4DE,#FFD57A);transition:width .55s ease}
        .mb-city-stage-caption{margin:8px 2px 0;color:#9FB6CA;font-size:.76rem;font-weight:700}
        @keyframes mbCityShimmer{0%,100%{opacity:.18;transform:translateX(0)}50%{opacity:.55;transform:translateX(9px)}}
        @keyframes mbCityAurora{0%,100%{opacity:.35}50%{opacity:.7}}
        @keyframes mbCityTwinkle{0%,100%{opacity:.25}50%{opacity:1}}
        @keyframes mbCityRing{0%{opacity:.9;transform:scale(.3)}100%{opacity:0;transform:scale(2.6)}}
        @media(prefers-reduced-motion:reduce){.mb-city-stage *{animation:none!important;transition:none!important}}
        @media(max-width:640px){.mb-city-stage{padding:12px;border-radius:20px}.mb-city-stage-art svg{min-height:210px}}
      `}</style>
    </section>
  );
}

function Window({x,y,width,height}:{x:number;y:number;width:number;height:number}) {
  return <rect className="mb-city-window" x={x} y={y} width={width} height={height} rx="2"/>;
}
