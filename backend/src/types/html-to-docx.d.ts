declare module 'html-to-docx' {
  interface HtmlToDocxOptions {
    orientation?: 'portrait' | 'landscape';
    margins?: Record<string, number>;
    title?: string;
    subject?: string;
    creator?: string;
    footer?: boolean;
    pageNumber?: boolean;
    [key: string]: unknown;
  }

  function HTMLtoDOCX(
    htmlString: string,
    headerHTML?: string | null,
    options?: HtmlToDocxOptions,
    footerHTML?: string | null,
  ): Promise<Buffer>;

  export = HTMLtoDOCX;
}
