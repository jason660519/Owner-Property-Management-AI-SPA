import{_ as k,e as v}from"./TownhouseColor--VjQBVqd.js";import{_ as S}from"./common_tenant_data.fragment-BuOJMkzd.js";import{_ as F}from"./application.fragment-BPK0_S5u.js";const h=`#import "./lease.fragment.graphql"
#import "./insurance.fragment.graphql"
#import "./common_tenant_data.fragment.graphql"
#import "./application.fragment.graphql"

fragment RenterFragment on Renter {
  ...CommonTenantDataFragment
  leases {
    ...LeaseFragment
  }
  past_leases {
    ...LeaseFragment
  }
  application {
    ...ApplicationFragment
  }
  applications {
    ...ApplicationFragment
  }
}
`,t={kind:"Document",definitions:[{kind:"FragmentDefinition",name:{kind:"Name",value:"RenterFragment"},typeCondition:{kind:"NamedType",name:{kind:"Name",value:"Renter"}},directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"FragmentSpread",name:{kind:"Name",value:"CommonTenantDataFragment"},directives:[]},{kind:"Field",name:{kind:"Name",value:"leases"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"FragmentSpread",name:{kind:"Name",value:"LeaseFragment"},directives:[]}]}},{kind:"Field",name:{kind:"Name",value:"past_leases"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"FragmentSpread",name:{kind:"Name",value:"LeaseFragment"},directives:[]}]}},{kind:"Field",name:{kind:"Name",value:"application"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"FragmentSpread",name:{kind:"Name",value:"ApplicationFragment"},directives:[]}]}},{kind:"Field",name:{kind:"Name",value:"applications"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"FragmentSpread",name:{kind:"Name",value:"ApplicationFragment"},directives:[]}]}}]}}],loc:{start:0,end:442,source:{name:"GraphQL request",locationOffset:{line:1,column:1},body:h}}},m=o=>{const r={};return o.filter(function(a){if(a.kind!=="FragmentDefinition")return!0;const l=a.name.value;return r[l]?!1:(r[l]=!0,!0)})};t.definitions=m(t.definitions.concat(k.definitions));t.definitions=m(t.definitions.concat(v.definitions));t.definitions=m(t.definitions.concat(S.definitions));t.definitions=m(t.definitions.concat(F.definitions));const _=(o,r)=>{const a=(e,n)=>{if(e.kind==="FragmentSpread")n.add(e.name.value);else if(e.kind==="VariableDefinition"){const i=e.type;i.kind==="NamedType"&&n.add(i.name.value)}return e&&"selectionSet"in e&&e.selectionSet&&e.selectionSet.selections.forEach(i=>{a(i,n)}),e&&"variableDefinitions"in e&&e.variableDefinitions&&e.variableDefinitions.forEach(i=>{a(i,n)}),e&&"definitions"in e&&e.definitions&&e.definitions.forEach(i=>{a(i,n)}),n},l=e=>{const n={};return e.definitions.forEach(function(i){"name"in i&&i.name&&(n[i.name.value]=a(i,new Set))}),n},f=(e,n)=>{for(let i=0;i<e.definitions.length;i++){const s=e.definitions[i];if(s&&"name"in s&&s.name&&s.name.value==n)return s}},p=l(o),g=Object.assign({},o,{definitions:[f(o,r)]}),u=p[r]||new Set,d=new Set;let c=new Set;for(u.forEach(e=>{c.add(e)});c.size>0;){const e=c;c=new Set,e.forEach(n=>{d.has(n)||(d.add(n),(p[n]||new Set).forEach(s=>{c.add(s)}))})}return d.forEach(e=>{const n=f(o,e);n&&g.definitions.push(n)}),g};_(t,"RenterFragment");export{t as _};
//# sourceMappingURL=renter.fragment-Bw-Iz3YH.js.map
