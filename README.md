# Ghighais AI Studio

buatkan aplikasi GHIGHAIS AI. Header hanya ada logo, nama aplikasi dan menu.

Menu berisi beranda, 11 database pilihan beserta dengan kotak token (wajib ada turso dan supabase sebagai rekomended), push github dengan token (ketika push github maka aplikasi akan menampilkan repostory yang ada dan user memilih untuk d push), save ke Zip, dan logout.

Beranda berisi kotak prompt agar user bisa mengetik intruksi dan juga ada kotak URL github, ketika user menempelkan URL github maka aplikasi wajib membuka aplikasi data tersebut. Saat genete prompt tampilkan presentase hasil generate. Pastikan PROMPT UNLIMITED full gratis yang terintegrasi dengan QWEN AI.

ada bagian kotak coding, setiap intruksi prompt yang dibuat oleh user maka secara otomatis akan muncul coding (wajib tanpa eror) dan pada kolom coding user juga bisa membuat coding secara manual.

Ada kotak perview yang dimana setiap intruksi prompt yang menghasilkan coding maka hasilnya akan tampil pada bagian perview. Pada bagian perview user bisa mengedit secara langusung untuk merubah apapun yang ada baik tulisan, hapus, geser atas bawah kanan kiri, ubah warna, ubah ukuran kotak panjang dan lebar sesuai yang user mau dan ada tombol terapkan, ketika itu di terapkan maka coding akan mengikuti hasil dari tampilan perview. Saat mode edit, smua tombol tidak aktif untuk memudahkan user mengedit, dan ketika tidak dalam mode edit user bisa beralih ke halaman sesuai yg user klik dan bagian halaman tersebut juga bisa di edit.

Jika ada eror maka AI wajib memperbaiki secara langsung agar tidak ada eror sama skali

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://ghighais-ai-studio.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b969a716-57ea-45e1-ba70-ffa040f12f0a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
