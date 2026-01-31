const e=`mutation updatePassword($currentPassword: String!, $password: String!) {
  updatePassword(
    input: { currentPassword: $currentPassword, newPassword: $password }
  ) {
    ok
  }
}
`,a={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"mutation",name:{kind:"Name",value:"updatePassword"},variableDefinitions:[{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"currentPassword"}},type:{kind:"NonNullType",type:{kind:"NamedType",name:{kind:"Name",value:"String"}}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"password"}},type:{kind:"NonNullType",type:{kind:"NamedType",name:{kind:"Name",value:"String"}}},directives:[]}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"updatePassword"},arguments:[{kind:"Argument",name:{kind:"Name",value:"input"},value:{kind:"ObjectValue",fields:[{kind:"ObjectField",name:{kind:"Name",value:"currentPassword"},value:{kind:"Variable",name:{kind:"Name",value:"currentPassword"}}},{kind:"ObjectField",name:{kind:"Name",value:"newPassword"},value:{kind:"Variable",name:{kind:"Name",value:"password"}}}]}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"ok"},arguments:[],directives:[]}]}}]}}],loc:{start:0,end:221,source:{name:"GraphQL request",locationOffset:{line:1,column:1},body:e}}};export{a as _};
//# sourceMappingURL=updatePassword-CRw_-zJf.js.map
