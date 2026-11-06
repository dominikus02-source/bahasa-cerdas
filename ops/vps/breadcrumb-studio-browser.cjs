const {chromium,expect}=require(process.env.RUNNER_TEMP+"/browser-tools/node_modules/@playwright/test");
const fs=require("node:fs");
(async()=>{const fixture=JSON.parse(fs.readFileSync(process.env.RUNNER_TEMP+"/breadcrumb-fixture.json","utf8"));const browser=await chromium.launch({channel:"chrome",headless:true});try{
 const page=await browser.newPage();const origin="http://127.0.0.1:33492";
 await page.goto(origin+"/login");await page.getByLabel("Alamat email").fill(fixture.email);await page.getByLabel("Kata sandi",{exact:true}).fill(fixture.password);await page.getByRole("button",{name:"Masuk ke Studio"}).click();await page.waitForURL("**/studio");
 const menu=page.getByRole("navigation",{name:"Menu studio"}),trail=page.getByRole("navigation",{name:"Jejak navigasi"});
 await menu.getByRole("button",{name:"Buat Buku",exact:true}).click();
 await expect(trail.locator('[aria-current="page"]')).toHaveText("Buat Buku");
 await page.getByLabel("Judul sementara").fill("Buku breadcrumb uji image");
 await page.getByLabel("Apa tujuan utama buku ini?").fill("Menguji penyimpanan dan navigasi buku melalui image rilis yang sebenarnya.");
 await page.getByLabel("Masalah apa yang ingin diselesaikan?").fill("Navigasi detail harus tetap sesuai ketika pengguna berpindah halaman.");
 await page.getByLabel("Topik dan ruang lingkup").fill("Pengujian breadcrumb buku dan bab");
 await page.getByRole("button",{name:"Susun prompt induk"}).click();await page.getByRole("button",{name:"Simpan proyek buku"}).click();
 await page.getByRole("button",{name:/Buku breadcrumb uji image/}).click();
 await expect(trail.locator('[aria-current="page"]')).toHaveText("Buku breadcrumb uji image");
 await expect(page.getByLabel("Judul buku",{exact:true})).toHaveValue("Buku breadcrumb uji image");
 await menu.getByRole("button",{name:"Studio Penulisan",exact:true}).click();
 await page.getByLabel("Judul bab",{exact:true}).fill("Bab pertama uji breadcrumb");
 await page.getByLabel("Isi bab",{exact:true}).fill("Ini naskah sementara untuk menguji penyimpanan dan navigasi detail pada image rilis.");
 await page.getByRole("button",{name:"Simpan bab",exact:true}).click();
 await page.locator("summary").filter({hasText:"Bab pertama uji breadcrumb"}).click();
 await expect(trail.locator('[aria-current="page"]')).toHaveText("Bab pertama uji breadcrumb");
 await page.reload();await expect(trail.locator('[aria-current="page"]')).toHaveText("Bab pertama uji breadcrumb");
 for(const width of [320,390,768,1440])for(const theme of ["light","dark"]){
  await page.setViewportSize({width,height:900});await page.evaluate(value=>{document.documentElement.dataset.theme=value;},theme);
  const size=await trail.evaluate(element=>({width:element.clientWidth,scroll:element.scrollWidth}));
  expect(size.scroll).toBeLessThanOrEqual(size.width+1);
 }
 await trail.getByRole("link",{name:"Buku breadcrumb uji image",exact:true}).click();await expect(page).not.toHaveURL(/chapter=/);
 await trail.getByRole("link",{name:"Studio Penulisan",exact:true}).click();await expect(page).not.toHaveURL(/book=/);
 await page.goBack();await expect(trail.locator('[aria-current="page"]')).toHaveText("Buku breadcrumb uji image");
 expect((await(await page.request.get(origin+"/api/auth/me")).json()).authenticated).toBe(true);
 await page.getByRole("button",{name:"Keluar",exact:true}).click();await page.waitForURL("**/login");
 expect((await(await page.request.get(origin+"/api/auth/me")).json()).authenticated).toBe(false);
 console.log("VPS_IMAGE_REAL_LOGIN_CRUD_BREADCRUMB_HISTORY_LOGOUT_PASS");
}finally{await browser.close();}})().catch(error=>{console.error(error.message);process.exitCode=1;});
