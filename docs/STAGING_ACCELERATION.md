# Percepatan staging
Jalankan npm run staging:build dari checkout staging terpisah. Node 22 dan npm diperlukan.
Runner memakai npm ci deterministik, cache unduhan persisten, mempertahankan .next/cache, dan mencetak durasi install/build.
Windows: set $env:BC_NPM_CACHE='F:\bc-tool-cache\npm' sebelum menjalankan. Linux: gunakan direktori cache milik akun deploy.
Dockerfile memakai BuildKit cache npm dan compiler Next dengan namespace berbeda per aplikasi.
CI memakai Node 22, npm cache dan .next/cache. Semua quality gate tetap berlaku.
Cache compiler dapat dihapus bila ada masalah; jangan menghapus cache setiap deploy.
Jangan memakai node_modules Windows pada Linux. Jangan memakai --no-cache untuk deploy rutin.
Gunakan builder staging terpisah dari produksi. Jangan paralelkan dua build berat di VPS 15 GiB tanpa mengukur RAM.
Ukur dua build pada commit dan konfigurasi sama; bandingkan durasi install dan build. Belum ada klaim percepatan sebelum pengukuran.
Rollback: revert commit ini. Tidak ada perubahan database, auth, LiveKit atau DNS.
Referensi: https://docs.docker.com/build/cache/optimize/ dan https://nextjs.org/docs/app/guides/ci-build-caching
