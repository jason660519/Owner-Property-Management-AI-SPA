import{r as c,u as m}from"./TownhouseColor--VjQBVqd.js";import{_ as f}from"./Combobox-Xn4TjqaT.js";import{bJ as i}from"./main-dumNSXg9.js";const k={TRANSACTIONS_FETCHING:"TRANSACTIONS_FETCHING",TRANSACTIONS_READY:"TRANSACTIONS_READY",TRANSACTIONS_ON_THE_WAY:"TRANSACTIONS_ON_THE_WAY"},h={[k.TRANSACTIONS_READY]:"review_transactions clicked",[k.TRANSACTIONS_ON_THE_WAY]:"okay_got_it clicked"},y=`query getAccountingEntities {
  accountingEntities {
    id
    name
    organizationId
    createdAt
    updatedAt
  }
}
`,F={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"getAccountingEntities"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"accountingEntities"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"name"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"organizationId"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"createdAt"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"updatedAt"},arguments:[],directives:[]}]}}]}}],loc:{start:0,end:160,source:{name:"GraphQL request",locationOffset:{line:1,column:1},body:y}}},S=`query getUnits($propertyId: ID, $entityId: ID) {
  units(propertyId: $propertyId, entityId: $entityId) {
    id
    name
    inactive
    organizationId
    propertyId
    entityId
    createdAt
    updatedAt
  }
}
`,b={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"getUnits"},variableDefinitions:[{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"propertyId"}},type:{kind:"NamedType",name:{kind:"Name",value:"ID"}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"entityId"}},type:{kind:"NamedType",name:{kind:"Name",value:"ID"}},directives:[]}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"units"},arguments:[{kind:"Argument",name:{kind:"Name",value:"propertyId"},value:{kind:"Variable",name:{kind:"Name",value:"propertyId"}}},{kind:"Argument",name:{kind:"Name",value:"entityId"},value:{kind:"Variable",name:{kind:"Name",value:"entityId"}}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"name"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"inactive"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"organizationId"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"propertyId"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"entityId"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"createdAt"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"updatedAt"},arguments:[],directives:[]}]}}]}}],loc:{start:0,end:253,source:{name:"GraphQL request",locationOffset:{line:1,column:1},body:S}}};function _(t,r){if(!t||!r)return[];const n=[],d=[];return r.filter(e=>!e.entityId).forEach(e=>{n.push({label:e.address1,value:i(e.id)??"",propertyId:i(e.id)??""})}),r.filter(e=>e.entityId).forEach(e=>{const a=t.find(u=>i(u.id)===e.entityId);if(a&&!d.includes(i(a.id)??"")){d.push(i(a.id)??"");const u=r.filter(s=>i(a.id)===s.entityId);u.length&&n.push({label:a.name,entityId:i(a.id)??"",options:[{label:a.name,value:i(a.id)??"",entityId:i(a.id)??"",isHidden:!0},...u.map(s=>({label:s.address1,value:i(s.id)??"",isGrouped:!0,entityId:i(a.id)??"",propertyId:i(s.id)??""}))]})}}),t.forEach(e=>{d.includes(i(e.id)??"")||n.push({label:e.name,value:i(e.id)??"",entityId:i(e.id)??""})}),[{label:"Shared across properties",value:"all"},...n]}function T(t,r){const n=t.filter(d=>d.propertyId===r).map(d=>({label:d.name??"",value:i(d.id)??""}));return n.length?[{label:"Shared across units",value:"all"},...n]:n}function R({scopeOption:t,unitOption:r,handleUnitOptionChange:n}){const[d,e]=c.useState([]),{data:a,loading:u}=m(F),{data:s,loading:v}=m(f),{data:g,loading:N}=m(b),p=u||v||N,I=_(a?.accountingEntities,s?.properties);return c.useEffect(()=>{if(t&&"value"in t){const l=T(g?.units??[],t.value);e(l);const o=l.find(A=>A.value===r?.value);o?n(o):l.length===1?n(l[0]):n(null)}},[t]),{isLoading:p,scopeOptions:I,unitOptions:d}}const D=`mutation updateAccount($input: updateAccountInput!) {
  updateAccount(input: $input) {
    ok
    account {
      id
      name
      type
      type2
      default
      openingBalance
      openingBalanceDate
      mortgagePaymentAmount
      mortgageInterestRate
      mortgagePMIAmount
      mortgageEscrowTransferAmount
      autobookMatchingTransactions
      lastCurrentBalance
      lastCurrentBalanceDate
      nonDepreciable
      importStartDate
      partnerBankAccountId
      partnerName
      aziboAccountId
      inactive
      institutionName
      accountNumberMask
      organizationId
      propertyId
      unitId
      entityId
      mortgageEscrowAccountId
      mortgagePaymentAccountId
      parentAccountId
      createdAt
      updatedAt
    }
  }
}
`,C={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"mutation",name:{kind:"Name",value:"updateAccount"},variableDefinitions:[{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"input"}},type:{kind:"NonNullType",type:{kind:"NamedType",name:{kind:"Name",value:"updateAccountInput"}}},directives:[]}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"updateAccount"},arguments:[{kind:"Argument",name:{kind:"Name",value:"input"},value:{kind:"Variable",name:{kind:"Name",value:"input"}}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"ok"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"account"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"name"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"type"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"type2"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"default"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"openingBalance"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"openingBalanceDate"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"mortgagePaymentAmount"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"mortgageInterestRate"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"mortgagePMIAmount"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"mortgageEscrowTransferAmount"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"autobookMatchingTransactions"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"lastCurrentBalance"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"lastCurrentBalanceDate"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"nonDepreciable"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"importStartDate"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"partnerBankAccountId"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"partnerName"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"aziboAccountId"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"inactive"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"institutionName"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"accountNumberMask"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"organizationId"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"propertyId"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"unitId"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"entityId"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"mortgageEscrowAccountId"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"mortgagePaymentAccountId"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"parentAccountId"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"createdAt"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"updatedAt"},arguments:[],directives:[]}]}}]}}]}}],loc:{start:0,end:815,source:{name:"GraphQL request",locationOffset:{line:1,column:1},body:D}}};export{k as K,h as S,C as _,R as u};
//# sourceMappingURL=updateAccount-Be5-UCsl.js.map
