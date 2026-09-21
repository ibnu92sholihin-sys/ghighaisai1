# Penyempurnaan Editor GHIGHAIS AI

## Yang akan dibangun

1. **Editor kode berwarna**
   - Ganti area kode polos dengan editor yang memberi warna berbeda pada tag HTML, atribut, nilai, komentar, CSS, dan JavaScript.
   - Tetap bisa diketik manual dan tersinkron dengan hasil generate AI.

2. **Tema tombol 3D interaktif**
   - Beri seluruh tombol kedalaman visual melalui bayangan dan lapisan permukaan.
   - Saat ditekan, tombol bergerak turun seperti tombol fisik lalu kembali dengan transisi singkat.
   - Hormati pengaturan perangkat yang mengurangi animasi.

3. **Undo saat mengedit preview**
   - Tambahkan tombol Undo di panel edit preview.
   - Simpan riwayat perubahan teks, warna, ukuran, posisi, edit langsung, dan penghapusan elemen.
   - Undo mengembalikan perubahan terakhir tanpa keluar dari mode edit.

4. **Reset halaman**
   - Tambahkan tombol Reset dengan konfirmasi agar tidak tertekan tanpa sengaja.
   - Reset mengosongkan prompt, URL GitHub, kode, dan preview, lalu memperbarui data tersimpan.

5. **Data tetap ada setelah logout**
   - Logout hanya mengakhiri tampilan sesi pengguna.
   - Kode, prompt, URL GitHub, token database, dan token GitHub tetap tersimpan di perangkat yang sama dan dipulihkan saat masuk lagi.

## Detail teknis

- Editor memakai lapisan syntax highlighting yang mengikuti teks dan posisi scroll, tanpa mengubah alur generate yang sudah ada.
- Riwayat Undo dikelola di dalam preview agar perubahan visual dapat dikembalikan sebelum diterapkan ke kode.
- Reset menggunakan dialog konfirmasi dari komponen antarmuka yang sudah tersedia.
- Validasi akhir mencakup alur login, edit kode, Undo preview, Reset, logout/login ulang, serta tampilan desktop dan mobile.
