import{e as v}from"./TownhouseColor--VjQBVqd.js";const g=`#import './insurance.fragment.graphql'

fragment CommonTenantDataFragment on Renter {
  id
  created_at
  first_name
  last_name
  profile_pic
  profile_colors
  email
  telephone
  emergency_contact {
    name
    telephone
    relationship
  }
  insurances {
    ...RenterInsuranceFragment
  }
  renter_notes {
    user
    action
    status
    note
    date
    listingId
  }
}
`,c={kind:"Document",definitions:[{kind:"FragmentDefinition",name:{kind:"Name",value:"CommonTenantDataFragment"},typeCondition:{kind:"NamedType",name:{kind:"Name",value:"Renter"}},directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"created_at"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"first_name"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"last_name"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"profile_pic"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"profile_colors"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"email"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"telephone"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"emergency_contact"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"name"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"telephone"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"relationship"},arguments:[],directives:[]}]}},{kind:"Field",name:{kind:"Name",value:"insurances"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"FragmentSpread",name:{kind:"Name",value:"RenterInsuranceFragment"},directives:[]}]}},{kind:"Field",name:{kind:"Name",value:"renter_notes"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"user"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"action"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"status"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"note"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"date"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"listingId"},arguments:[],directives:[]}]}}]}}],loc:{start:0,end:420,source:{name:"GraphQL request",locationOffset:{line:1,column:1},body:g}}},p=s=>{const r={};return s.filter(function(t){if(t.kind!=="FragmentDefinition")return!0;const l=t.name.value;return r[l]?!1:(r[l]=!0,!0)})};c.definitions=p(c.definitions.concat(v.definitions));const F=(s,r)=>{const t=(e,n)=>{if(e.kind==="FragmentSpread")n.add(e.name.value);else if(e.kind==="VariableDefinition"){const i=e.type;i.kind==="NamedType"&&n.add(i.name.value)}return e&&"selectionSet"in e&&e.selectionSet&&e.selectionSet.selections.forEach(i=>{t(i,n)}),e&&"variableDefinitions"in e&&e.variableDefinitions&&e.variableDefinitions.forEach(i=>{t(i,n)}),e&&"definitions"in e&&e.definitions&&e.definitions.forEach(i=>{t(i,n)}),n},l=e=>{const n={};return e.definitions.forEach(function(i){"name"in i&&i.name&&(n[i.name.value]=t(i,new Set))}),n},o=(e,n)=>{for(let i=0;i<e.definitions.length;i++){const a=e.definitions[i];if(a&&"name"in a&&a.name&&a.name.value==n)return a}},u=l(s),f=Object.assign({},s,{definitions:[o(s,r)]}),k=u[r]||new Set,m=new Set;let d=new Set;for(k.forEach(e=>{d.add(e)});d.size>0;){const e=d;d=new Set,e.forEach(n=>{m.has(n)||(m.add(n),(u[n]||new Set).forEach(a=>{d.add(a)}))})}return m.forEach(e=>{const n=o(s,e);n&&f.definitions.push(n)}),f};F(c,"CommonTenantDataFragment");export{c as _};
//# sourceMappingURL=common_tenant_data.fragment-BuOJMkzd.js.map
