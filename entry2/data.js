/* entry2 네모 갤러리 전용 설정.
   SBD/assets/img/square01.jpg부터 연속 번호로 자동 확인합니다.
   square15.jpg를 넣고 새로고침하면 자동 추가됩니다.
   첫 없는 번호에서 탐색을 종료하므로 중간 번호는 비우지 마세요. */
const GALLERY_CONFIG = {
  prefix: "square",
  extension: "jpg",
  metadata: {
    // "square01.jpg": { quote: "Your quote", author: "Author", caption: "Location\nDate" }
  }
};
