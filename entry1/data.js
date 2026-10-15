/* entry1 전용 설정. Index의 assets/data.js와 별개입니다.
   사진 위치: SBD/assets/img/arch01.jpg, arch02.jpg ...
   arch14.jpg를 추가하고 새로고침하면 자동으로 추가됩니다.
   중간 번호가 없거나 이미지가 로드되지 않으면 그 앞에서 종료합니다.
   script.js의 IMG_DIR은 "../assets/img/"입니다. */
const GALLERY_CONFIG = {
  prefix: "arch",
  extension: "jpg",
  metadata: {
    // "arch01.jpg": { quote: "Your quote", author: "Author", caption: "Location\nDate" }
  }
};
