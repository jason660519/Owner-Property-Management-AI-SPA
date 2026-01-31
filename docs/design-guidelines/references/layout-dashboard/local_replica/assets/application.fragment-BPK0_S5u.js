import{f as g}from"./TownhouseColor--VjQBVqd.js";const p=`#import "./credit_check.fragment.graphql"

fragment ApplicationFragment on RentalRequest {
  id
  external
  landlord_pays
  first_name
  last_name
  submitted_date
  listing {
    id
    address
    state
    unit
    security_deposit_amount
    rent_amount
  }
  renter {
    id
    first_name
    last_name
    email
    created_at
    renter_notes {
      user
      action
      status
      note
      date
      listingId
    }
  }
  contacts {
    name
    telephone
    relationship
  }
  applying_as_tenant
  co_applicant
  co_applicant_description
  middle_name
  screening_report_type
  has_payment
  archived_at
  updated_at
  created_at
  credit_check {
    ...CreditCheckFragment
  }
  ssn
  coupon_applied
  section_8
}
`,c={kind:"Document",definitions:[{kind:"FragmentDefinition",name:{kind:"Name",value:"ApplicationFragment"},typeCondition:{kind:"NamedType",name:{kind:"Name",value:"RentalRequest"}},directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"external"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"landlord_pays"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"first_name"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"last_name"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"submitted_date"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"listing"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"address"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"state"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"unit"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"security_deposit_amount"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"rent_amount"},arguments:[],directives:[]}]}},{kind:"Field",name:{kind:"Name",value:"renter"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"first_name"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"last_name"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"email"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"created_at"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"renter_notes"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"user"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"action"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"status"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"note"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"date"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"listingId"},arguments:[],directives:[]}]}}]}},{kind:"Field",name:{kind:"Name",value:"contacts"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"name"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"telephone"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"relationship"},arguments:[],directives:[]}]}},{kind:"Field",name:{kind:"Name",value:"applying_as_tenant"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"co_applicant"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"co_applicant_description"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"middle_name"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"screening_report_type"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"has_payment"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"archived_at"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"updated_at"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"created_at"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"credit_check"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"FragmentSpread",name:{kind:"Name",value:"CreditCheckFragment"},directives:[]}]}},{kind:"Field",name:{kind:"Name",value:"ssn"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"coupon_applied"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"section_8"},arguments:[],directives:[]}]}}],loc:{start:0,end:774,source:{name:"GraphQL request",locationOffset:{line:1,column:1},body:p}}},_=d=>{const s={};return d.filter(function(a){if(a.kind!=="FragmentDefinition")return!0;const m=a.name.value;return s[m]?!1:(s[m]=!0,!0)})};c.definitions=_(c.definitions.concat(g.definitions));const f=(d,s)=>{const a=(e,i)=>{if(e.kind==="FragmentSpread")i.add(e.name.value);else if(e.kind==="VariableDefinition"){const n=e.type;n.kind==="NamedType"&&i.add(n.name.value)}return e&&"selectionSet"in e&&e.selectionSet&&e.selectionSet.selections.forEach(n=>{a(n,i)}),e&&"variableDefinitions"in e&&e.variableDefinitions&&e.variableDefinitions.forEach(n=>{a(n,i)}),e&&"definitions"in e&&e.definitions&&e.definitions.forEach(n=>{a(n,i)}),i},m=e=>{const i={};return e.definitions.forEach(function(n){"name"in n&&n.name&&(i[n.name.value]=a(n,new Set))}),i},u=(e,i)=>{for(let n=0;n<e.definitions.length;n++){const t=e.definitions[n];if(t&&"name"in t&&t.name&&t.name.value==i)return t}},o=m(d),k=Object.assign({},d,{definitions:[u(d,s)]}),v=o[s]||new Set,l=new Set;let r=new Set;for(v.forEach(e=>{r.add(e)});r.size>0;){const e=r;r=new Set,e.forEach(i=>{l.has(i)||(l.add(i),(o[i]||new Set).forEach(t=>{r.add(t)}))})}return l.forEach(e=>{const i=u(d,e);i&&k.definitions.push(i)}),k};f(c,"ApplicationFragment");export{c as _};
//# sourceMappingURL=application.fragment-BPK0_S5u.js.map
