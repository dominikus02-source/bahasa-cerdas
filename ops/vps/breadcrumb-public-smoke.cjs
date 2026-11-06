const {chromium}=require(process.env.RUNNER_TEMP+"/browser-tools/node_modules/@playwright/test");
(async()=>{const browser=await chromium.launch({channel:"chrome",headless:true});try{
 for(const [app,origin,paths] of [["studio","https://bcbookstudio.bahasacerdas.com",["/login","/activate"]],["main","https://www.bahasacerdas.com",["/tentang","/faq"]]]){
  const page=await browser.newPage();
  for(const path of paths){
   try{
    const response=await page.goto(origin+path,{waitUntil:"domcontentloaded",timeout:30000});
    const trail=page.getByRole("navigation",{name:"Jejak navigasi"});
    await trail.waitFor({timeout:15000});
    const current=await trail.locator('[aria-current="page"]').innerText();
    console.log(JSON.stringify({app,path,http:response.status(),breadcrumb:current,verified:response.ok()&&!!current}));
   }catch(error){console.log(JSON.stringify({app,path,verified:false,error:error.message.split("\n")[0]}));}
  }
  await page.close();
 }
}finally{await browser.close();}})().catch(error=>{console.error(error.message);process.exitCode=1;});
