/**
 * 이 글이 품는 도구.
 *
 * 글 폴더가 도구를 소유한다. 본문에 아래 한 줄을 두면 그 자리가 이 도구로 바뀐다.
 *
 * ```text
 * https://eddmpython.com/tool/python-qr
 * ```
 *
 * 이름은 이 폴더 이름에서 나온다. `003-python-qr` 에서 앞의 순번을 뗀 `python-qr` 이다.
 * 따로 등록하는 파일은 없고 사이트가 `blog/posts/*​/tool/index.tsx` 를 훑어 찾는다.
 */
export { QrTool as default } from "./QrTool";
