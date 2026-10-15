/* 로컬 circle 갤러리 설정. 사진 목록/개수를 입력할 필요 없습니다.
   circle01.jpg부터 번호가 이어져야 합니다. 중간에 빠진 번호가 있으면 그 앞까지 표시.
   JPG 대문자 확장자라면 extension: "JPG"로 변경하세요.
   metadata는 선택사항. 사진별 인용문/캡션이 필요할 때 파일명을 키로 추가하세요. */
const CIRCLE_GALLERY = {
  prefix: "circle",
  extension: "jpg",
  metadata: {
    // "circle01.jpg": { quote: "Your quote", author: "Author", caption: "Location\nDate" }
  }
};
