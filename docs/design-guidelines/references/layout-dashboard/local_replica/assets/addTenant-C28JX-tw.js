import{_ as v}from"./renter.fragment-Bw-Iz3YH.js";const p=`#import "../fragments/renter.fragment.graphql"

mutation addTenant(
  $tenant: RenterInput!
  $lease_id: String!
  $invite_to_tenant_portal: Boolean
) {
  addTenant(
    input: {
      inputTenant: $tenant
      lease_id: $lease_id
      invite_to_tenant_portal: $invite_to_tenant_portal
    }
  ) {
    tenant {
      ...RenterFragment
    }
  }
}
`,c={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"mutation",name:{kind:"Name",value:"addTenant"},variableDefinitions:[{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"tenant"}},type:{kind:"NonNullType",type:{kind:"NamedType",name:{kind:"Name",value:"RenterInput"}}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"lease_id"}},type:{kind:"NonNullType",type:{kind:"NamedType",name:{kind:"Name",value:"String"}}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"invite_to_tenant_portal"}},type:{kind:"NamedType",name:{kind:"Name",value:"Boolean"}},directives:[]}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"addTenant"},arguments:[{kind:"Argument",name:{kind:"Name",value:"input"},value:{kind:"ObjectValue",fields:[{kind:"ObjectField",name:{kind:"Name",value:"inputTenant"},value:{kind:"Variable",name:{kind:"Name",value:"tenant"}}},{kind:"ObjectField",name:{kind:"Name",value:"lease_id"},value:{kind:"Variable",name:{kind:"Name",value:"lease_id"}}},{kind:"ObjectField",name:{kind:"Name",value:"invite_to_tenant_portal"},value:{kind:"Variable",name:{kind:"Name",value:"invite_to_tenant_portal"}}}]}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"tenant"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"FragmentSpread",name:{kind:"Name",value:"RenterFragment"},directives:[]}]}}]}}]}}],loc:{start:0,end:387,source:{name:"GraphQL request",locationOffset:{line:1,column:1},body:p}}},_=l=>{const r={};return l.filter(function(t){if(t.kind!=="FragmentDefinition")return!0;const o=t.name.value;return r[o]?!1:(r[o]=!0,!0)})};c.definitions=_(c.definitions.concat(v.definitions));const b=(l,r)=>{const t=(e,n)=>{if(e.kind==="FragmentSpread")n.add(e.name.value);else if(e.kind==="VariableDefinition"){const i=e.type;i.kind==="NamedType"&&n.add(i.name.value)}return e&&"selectionSet"in e&&e.selectionSet&&e.selectionSet.selections.forEach(i=>{t(i,n)}),e&&"variableDefinitions"in e&&e.variableDefinitions&&e.variableDefinitions.forEach(i=>{t(i,n)}),e&&"definitions"in e&&e.definitions&&e.definitions.forEach(i=>{t(i,n)}),n},o=e=>{const n={};return e.definitions.forEach(function(i){"name"in i&&i.name&&(n[i.name.value]=t(i,new Set))}),n},m=(e,n)=>{for(let i=0;i<e.definitions.length;i++){const a=e.definitions[i];if(a&&"name"in a&&a.name&&a.name.value==n)return a}},u=o(l),f=Object.assign({},l,{definitions:[m(l,r)]}),k=u[r]||new Set,s=new Set;let d=new Set;for(k.forEach(e=>{d.add(e)});d.size>0;){const e=d;d=new Set,e.forEach(n=>{s.has(n)||(s.add(n),(u[n]||new Set).forEach(a=>{d.add(a)}))})}return s.forEach(e=>{const n=m(l,e);n&&f.definitions.push(n)}),f};b(c,"addTenant");export{c as _};
//# sourceMappingURL=addTenant-C28JX-tw.js.map
