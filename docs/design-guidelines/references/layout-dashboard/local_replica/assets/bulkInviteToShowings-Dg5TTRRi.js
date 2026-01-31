const e=`mutation sendBulkInviteToShowings($leads: [BulkInviteToShowingsInput]) {
  sendBulkInviteToShowings(input: { leads: $leads }) {
    all_invites_sent
    all_invites_failed
    partially_sent_invites
  }
}
`,i={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"mutation",name:{kind:"Name",value:"sendBulkInviteToShowings"},variableDefinitions:[{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"leads"}},type:{kind:"ListType",type:{kind:"NamedType",name:{kind:"Name",value:"BulkInviteToShowingsInput"}}},directives:[]}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"sendBulkInviteToShowings"},arguments:[{kind:"Argument",name:{kind:"Name",value:"input"},value:{kind:"ObjectValue",fields:[{kind:"ObjectField",name:{kind:"Name",value:"leads"},value:{kind:"Variable",name:{kind:"Name",value:"leads"}}}]}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"all_invites_sent"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"all_invites_failed"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"partially_sent_invites"},arguments:[],directives:[]}]}}]}}],loc:{start:0,end:243,source:{name:"GraphQL request",locationOffset:{line:1,column:1},body:e}}};export{i as _};
//# sourceMappingURL=bulkInviteToShowings-Dg5TTRRi.js.map
