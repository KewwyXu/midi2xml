declare module "xml-writer" {
  export type StringReturningFunction = (...args:any[]) => string;

  export type StringOrFunction = string|StringReturningFunction; 
  
  export type WritableContent = StringOrFunction|XMLWriter|number;

  export default class XMLWriter {
    constructor(indent?:boolean|string, callback?:(text:string, encoding:string) => void);

    toString():string;

    indenter():void;

    flush():void;

    write(...strings:string[]):void;

    startDocument(version?:string, encoding?:string, standalone?:boolean):XMLWriter;

    endDocument():XMLWriter;

    writeElement(name:WritableContent, content:WritableContent):XMLWriter;

    writeElementNS(prefix:WritableContent, name:WritableContent, uri:StringOrFunction, content?:StringOrFunction):XMLWriter;
    
    startElement(name:WritableContent):XMLWriter;
    
    startElementNS(prefix:WritableContent, name:WritableContent, uri:string):XMLWriter;
    
    endElement():XMLWriter;

    writeAttribute(name:string, content:StringOrFunction):XMLWriter;

    writeAttributeNS(prefix:WritableContent, name:WritableContent, uri:StringOrFunction, content?:StringOrFunction):XMLWriter;

    startAttributes():XMLWriter;

    endAttributes():XMLWriter;

    startAttribute(name:WritableContent):XMLWriter;

    startAttribute(prefix:WritableContent, name:WritableContent, uri:string):XMLWriter;

    endAttribute():XMLWriter;

    text(content:WritableContent):XMLWriter;

    writeComment(content:WritableContent):XMLWriter;

    startComment():XMLWriter;

    endComment():XMLWriter;

    writeDocType(name:WritableContent, pubid?:WritableContent, sysid?:WritableContent, subset?:WritableContent):XMLWriter;

    startDocType(name:WritableContent, pubid?:WritableContent, sysid?:WritableContent, subset?:WritableContent):XMLWriter;

    endDocType():XMLWriter;

    writePI(name:WritableContent, content:WritableContent):XMLWriter;

    startPI(name:WritableContent):XMLWriter;

    endPI():XMLWriter;

    writeCData(content:WritableContent):XMLWriter;

    startCData():XMLWriter;

    endCData():XMLWriter;

    writeRaw(content:WritableContent):XMLWriter;
  }
}
