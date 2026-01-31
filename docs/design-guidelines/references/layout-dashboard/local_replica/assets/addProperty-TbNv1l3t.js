import{a as v,b as g}from"./main-dumNSXg9.js";const b=`#import "../../fragments/listing.fragment.graphql"
#import "../../fragments/children_listings.fragment.graphql"

mutation addProperty(
  $inputData: AddPropertyInput!
  $autocreateDraftLease: Boolean
  $fromOnboarding: Boolean
) {
  addProperty(
    input: {
      inputData: $inputData
      autocreateDraftLease: $autocreateDraftLease
      fromOnboarding: $fromOnboarding
    }
  ) {
    listing {
      ...PropertyListingFragment
      ...ChildrenListingsFragment
    }
  }
}
`,l={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"mutation",name:{kind:"Name",value:"addProperty"},variableDefinitions:[{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"inputData"}},type:{kind:"NonNullType",type:{kind:"NamedType",name:{kind:"Name",value:"AddPropertyInput"}}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"autocreateDraftLease"}},type:{kind:"NamedType",name:{kind:"Name",value:"Boolean"}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"fromOnboarding"}},type:{kind:"NamedType",name:{kind:"Name",value:"Boolean"}},directives:[]}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"addProperty"},arguments:[{kind:"Argument",name:{kind:"Name",value:"input"},value:{kind:"ObjectValue",fields:[{kind:"ObjectField",name:{kind:"Name",value:"inputData"},value:{kind:"Variable",name:{kind:"Name",value:"inputData"}}},{kind:"ObjectField",name:{kind:"Name",value:"autocreateDraftLease"},value:{kind:"Variable",name:{kind:"Name",value:"autocreateDraftLease"}}},{kind:"ObjectField",name:{kind:"Name",value:"fromOnboarding"},value:{kind:"Variable",name:{kind:"Name",value:"fromOnboarding"}}}]}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"listing"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"FragmentSpread",name:{kind:"Name",value:"PropertyListingFragment"},directives:[]},{kind:"FragmentSpread",name:{kind:"Name",value:"ChildrenListingsFragment"},directives:[]}]}}]}}]}}],loc:{start:0,end:518,source:{name:"GraphQL request",locationOffset:{line:1,column:1},body:b}}},k=r=>{const o={};return r.filter(function(a){if(a.kind!=="FragmentDefinition")return!0;const s=a.name.value;return o[s]?!1:(o[s]=!0,!0)})};l.definitions=k(l.definitions.concat(v.definitions));l.definitions=k(l.definitions.concat(g.definitions));const D=(r,o)=>{const a=(e,i)=>{if(e.kind==="FragmentSpread")i.add(e.name.value);else if(e.kind==="VariableDefinition"){const n=e.type;n.kind==="NamedType"&&i.add(n.name.value)}return e&&"selectionSet"in e&&e.selectionSet&&e.selectionSet.selections.forEach(n=>{a(n,i)}),e&&"variableDefinitions"in e&&e.variableDefinitions&&e.variableDefinitions.forEach(n=>{a(n,i)}),e&&"definitions"in e&&e.definitions&&e.definitions.forEach(n=>{a(n,i)}),i},s=e=>{const i={};return e.definitions.forEach(function(n){"name"in n&&n.name&&(i[n.name.value]=a(n,new Set))}),i},m=(e,i)=>{for(let n=0;n<e.definitions.length;n++){const t=e.definitions[n];if(t&&"name"in t&&t.name&&t.name.value==i)return t}},u=s(r),f=Object.assign({},r,{definitions:[m(r,o)]}),p=u[o]||new Set,c=new Set;let d=new Set;for(p.forEach(e=>{d.add(e)});d.size>0;){const e=d;d=new Set,e.forEach(i=>{c.has(i)||(c.add(i),(u[i]||new Set).forEach(t=>{d.add(t)}))})}return c.forEach(e=>{const i=m(r,e);i&&f.definitions.push(i)}),f};D(l,"addProperty");export{l as _};
//# sourceMappingURL=addProperty-TbNv1l3t.js.map
