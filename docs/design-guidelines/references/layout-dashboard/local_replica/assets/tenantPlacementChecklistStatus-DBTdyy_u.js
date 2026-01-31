const e=`query tenantPlacementChecklistStatus($listingId: String!) {
  tenant_placement_checklist_status(listingId: $listingId) {
    id
    completedPercentage
    completedCount
    status
    steps {
      preTPASign
      showings
      listingDetails
      leaseSetup
      linkBankAndPayment {
        status
        entityId
        bankAccountId
      }
      applicant
      signLeaseAgreement
      receiveSecurityDeposit
    }
  }
}
`,i={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"tenantPlacementChecklistStatus"},variableDefinitions:[{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"listingId"}},type:{kind:"NonNullType",type:{kind:"NamedType",name:{kind:"Name",value:"String"}}},directives:[]}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"tenant_placement_checklist_status"},arguments:[{kind:"Argument",name:{kind:"Name",value:"listingId"},value:{kind:"Variable",name:{kind:"Name",value:"listingId"}}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"completedPercentage"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"completedCount"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"status"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"steps"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"preTPASign"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"showings"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"listingDetails"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"leaseSetup"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"linkBankAndPayment"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"status"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"entityId"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"bankAccountId"},arguments:[],directives:[]}]}},{kind:"Field",name:{kind:"Name",value:"applicant"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"signLeaseAgreement"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"receiveSecurityDeposit"},arguments:[],directives:[]}]}}]}}]}}],loc:{start:0,end:473,source:{name:"GraphQL request",locationOffset:{line:1,column:1},body:e}}};export{i as _};
//# sourceMappingURL=tenantPlacementChecklistStatus-DBTdyy_u.js.map
