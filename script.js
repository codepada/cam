const cameraFeed = document.getElementById('cameraFeed');
const takePhotoButton = document.getElementById('takePhotoButton');
const photoCanvas = document.getElementById('photoCanvas');
const galleryButton = document.getElementById('galleryButton');
const imageInput = document.getElementById('imageInput');
const galleryPreview = document.getElementById('galleryPreview');
const zoomSlider = document.getElementById('zoomSlider');

let currentStream; // เก็บ stream ของกล้อง
let imageCapture; // ใช้สำหรับถ่ายภาพนิ่ง
let track; // เก็บ track ของวิดีโอ เพื่อควบคุมซูม
let currentZoom = 1.0;

// --- 1. เริ่มต้นกล้อง ---
async function startCamera() {
    try {
        const constraints = {
            video: {
                facingMode: 'environment', // ใช้กล้องหลัง
                width: { ideal: 1280 }, // ความละเอียดที่ต้องการ
                height: { ideal: 720 }
            }
        };
        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        cameraFeed.srcObject = currentStream;

        // ดึง VideoTrack เพื่อควบคุมซูมและ ImageCapture
        track = currentStream.getVideoTracks()[0];
        imageCapture = new ImageCapture(track);

        // ตั้งค่า Zoom Slider ตามความสามารถของกล้อง
        if ('getCapabilities' in track) {
            const capabilities = track.getCapabilities();
            if (capabilities.zoom) {
                zoomSlider.min = capabilities.zoom.min;
                zoomSlider.max = capabilities.zoom.max;
                zoomSlider.step = capabilities.zoom.step;
                zoomSlider.value = capabilities.zoom.current;
                currentZoom = capabilities.zoom.current; // ตั้งค่าเริ่มต้นให้ตรงกับกล้อง
            } else {
                zoomSlider.style.display = 'none'; // ซ่อน slider ถ้าไม่รองรับซูม
            }
        } else {
            zoomSlider.style.display = 'none'; // ซ่อน slider ถ้าไม่รองรับ getCapabilities
        }

        // โหลดรูปภาพล่าสุดที่เลือกไว้มาแสดงบนปุ่ม Gallery
        loadLastSelectedImage();

    } catch (error) {
        console.error('Error accessing camera:', error);
        alert('Cannot access camera. Please check permissions.');
    }
}

// --- 2. ถ่ายรูป ---
takePhotoButton.addEventListener('click', async () => {
    if (!imageCapture) {
        alert('Camera not ready.');
        return;
    }

    try {
        const photoBlob = await imageCapture.takePhoto();
        const imageUrl = URL.createObjectURL(photoBlob);

        // สร้างลิงก์สำหรับดาวน์โหลด
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `photo-${Date.now()}.png`; // ชื่อไฟล์
        document.body.appendChild(link);
        link.click(); // คลิกอัตโนมัติเพื่อดาวน์โหลด
        document.body.removeChild(link);
        URL.revokeObjectURL(imageUrl); // ล้าง URL

        // อาจจะแสดงรูปที่ถ่ายลงบน canvas ชั่วคราวได้
        // const image = await createImageBitmap(photoBlob);
        // photoCanvas.width = image.width;
        // photoCanvas.height = image.height;
        // photoCanvas.getContext('2d').drawImage(image, 0, 0);
        // photoCanvas.style.display = 'block';
        // cameraFeed.style.display = 'none';
        // setTimeout(() => {
        //     photoCanvas.style.display = 'none';
        //     cameraFeed.style.display = 'block';
        // }, 1000); // แสดงแค่ 1 วินาที

    } catch (error) {
        console.error('Error taking photo:', error);
        alert('Failed to take photo.');
    }
});

// --- 3. การซูม (Digital Zoom) ---
zoomSlider.addEventListener('input', (event) => {
    const zoomValue = parseFloat(event.target.value);
    if (track && 'applyConstraints' in track) {
        try {
            // Apply zoom constraint
            track.applyConstraints({
                advanced: [{ zoom: zoomValue }]
            }).then(() => {
                currentZoom = zoomValue;
                console.log('Zoom applied:', currentZoom);
            }).catch(e => {
                console.error('Error applying zoom constraints:', e);
            });
        } catch (e) {
            console.error('Error applying zoom constraints (sync):', e);
        }
    } else {
        // Fallback for browsers not supporting native zoom control
        // This is a basic digital zoom by scaling the video element
        cameraFeed.style.transform = `scale(${zoomValue}) scaleX(-1)`; // scaleX(-1) สำหรับกล้องหน้า
        // หากใช้กล้องหลังอย่างเดียว ให้เป็น cameraFeed.style.transform = `scale(${zoomValue})`;
        currentZoom = zoomValue;
    }
});


// --- 4. การเลือกรูปจาก Gallery ---
galleryButton.addEventListener('click', () => {
    imageInput.click(); // คลิก input type="file" ที่ซ่อนอยู่
});

imageInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageDataUrl = e.target.result;
            galleryPreview.src = imageDataUrl;
            localStorage.setItem('lastSelectedImage', imageDataUrl); // เก็บใน Local Storage
            // คุณสามารถทำอะไรกับรูปที่เลือกได้ที่นี่ เช่น แสดงบน canvas, อัปโหลด
            console.log('Image selected:', file.name);
            // แสดงรูปที่เลือกบน canvas ชั่วคราว
            // const img = new Image();
            // img.onload = () => {
            //     photoCanvas.width = img.width;
            //     photoCanvas.height = img.height;
            //     photoCanvas.getContext('2d').drawImage(img, 0, 0);
            //     photoCanvas.style.display = 'block';
            //     cameraFeed.style.display = 'none';
            //     setTimeout(() => {
            //         photoCanvas.style.display = 'none';
            //         cameraFeed.style.display = 'block';
            //     }, 2000);
            // };
            // img.src = imageDataUrl;
        };
        reader.readAsDataURL(file);
    }
});

// โหลดรูปที่เลือกครั้งล่าสุดมาแสดงเมื่อเปิดแอป
function loadLastSelectedImage() {
    const lastImage = localStorage.getItem('lastSelectedImage');
    if (lastImage) {
        galleryPreview.src = lastImage;
    } else {
        galleryPreview.src = 'icons/gallery-placeholder.png'; // รูปเริ่มต้น
    }
}


// --- 5. PWA Manifest และ Service Worker ---

// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker registered! Scope:', registration.scope);
            })
            .catch(err => {
                console.error('Service Worker registration failed:', err);
            });
    });
}

// --- เริ่มต้นกล้องเมื่อหน้าเว็บโหลดเสร็จ ---
window.addEventListener('load', startCamera);