const e=`query GetCustomPreScreenerQuestions($ownerId: String) {
  customPreScreenerQuestions(ownerId: $ownerId) {
    id
    question
  }
}
`,n={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"GetCustomPreScreenerQuestions"},variableDefinitions:[{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"ownerId"}},type:{kind:"NamedType",name:{kind:"Name",value:"String"}},directives:[]}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"customPreScreenerQuestions"},arguments:[{kind:"Argument",name:{kind:"Name",value:"ownerId"},value:{kind:"Variable",name:{kind:"Name",value:"ownerId"}}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"question"},arguments:[],directives:[]}]}}]}}],loc:{start:0,end:170,source:{name:"GraphQL request",locationOffset:{line:1,column:1},body:e}}};export{n as _};
//# sourceMappingURL=getCustomPreScreenerQuestions-q6Ha4UZW.js.map
