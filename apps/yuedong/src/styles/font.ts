interface FontFamily {
  extraLight: string;
  light: string;
  normal: string;
  regular: string;
  medium: string;
  bold: string;
  heavy: string;
}
let fontFamily: FontFamily = {
  extraLight: 'SourceHanSansCN-ExtraLight',
  light: 'SourceHanSansCN-Light',
  normal: 'SourceHanSansCN-Normal',
  regular: 'SourceHanSansCN-Regular',
  medium: 'SourceHanSansCN-Medium',
  bold: 'SourceHanSansCN-Bold',
  heavy: 'SourceHanSansCN-Heavy',
};
let style = document.createElement('style');
let baseUrl = serviceConfig[import.meta.env.VITE_USER_NODE_ENV].VITE_API_FONT_URL;
let familyList = Object.values(fontFamily).map((i: string): string => {
  return `
      @font-face {
        font-family: ${i};
        src: url('${baseUrl}/${i}.otf') format('truetype'),
          url('${baseUrl}/${i}.ttf') format('truetype');
      }
    `;
});
style.appendChild(document.createTextNode(familyList.join('')));
document.head.appendChild(style);
export {};
