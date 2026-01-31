import{r as s,j as n,y as m,z as l,P as r}from"./TownhouseColor--VjQBVqd.js";import{z as u}from"./main-dumNSXg9.js";const o=`mutation requestRentEstimateMutation(
  $address: String!
  $bedrooms: Int
  $baths: Float
  $buildingType: RentEstimateBuildingType
  $email: String
) {
  requestRentEstimate(
    input: {
      address: $address
      bedrooms: $bedrooms
      baths: $baths
      buildingType: $buildingType
      email: $email
    }
  ) {
    rentEstimate {
      id
      min
      max
      mean
      address
      bedrooms
      baths
      percentile_25
      percentile_75
      samples
      radius_miles
      building_type
    }
  }
}
`,N={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"mutation",name:{kind:"Name",value:"requestRentEstimateMutation"},variableDefinitions:[{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"address"}},type:{kind:"NonNullType",type:{kind:"NamedType",name:{kind:"Name",value:"String"}}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"bedrooms"}},type:{kind:"NamedType",name:{kind:"Name",value:"Int"}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"baths"}},type:{kind:"NamedType",name:{kind:"Name",value:"Float"}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"buildingType"}},type:{kind:"NamedType",name:{kind:"Name",value:"RentEstimateBuildingType"}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"email"}},type:{kind:"NamedType",name:{kind:"Name",value:"String"}},directives:[]}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"requestRentEstimate"},arguments:[{kind:"Argument",name:{kind:"Name",value:"input"},value:{kind:"ObjectValue",fields:[{kind:"ObjectField",name:{kind:"Name",value:"address"},value:{kind:"Variable",name:{kind:"Name",value:"address"}}},{kind:"ObjectField",name:{kind:"Name",value:"bedrooms"},value:{kind:"Variable",name:{kind:"Name",value:"bedrooms"}}},{kind:"ObjectField",name:{kind:"Name",value:"baths"},value:{kind:"Variable",name:{kind:"Name",value:"baths"}}},{kind:"ObjectField",name:{kind:"Name",value:"buildingType"},value:{kind:"Variable",name:{kind:"Name",value:"buildingType"}}},{kind:"ObjectField",name:{kind:"Name",value:"email"},value:{kind:"Variable",name:{kind:"Name",value:"email"}}}]}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"rentEstimate"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"min"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"max"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"mean"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"address"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"bedrooms"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"baths"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"percentile_25"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"percentile_75"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"samples"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"radius_miles"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"building_type"},arguments:[],directives:[]}]}}]}}]}}],loc:{start:0,end:569,source:{name:"GraphQL request",locationOffset:{line:1,column:1},body:o}}},k="/assets/rentometerJson.animation-B-kdgr1w.json",v=({onComplete:e,...t})=>{const i=l(),d=5e3;if(s.useEffect(()=>{e&&i&&setTimeout(()=>{e()},d)},[]),i)return n.jsx(u,{src:"https://lottie.host/?file=67b50103-4d9e-4534-9484-58131e3e4955/TLUmHCoOGn.json"});const a=m({path:k,loop:!1,autoplay:!0,onComplete:e});return a.setSpeed(.8),n.jsx("div",{...t,children:a.View})};v.propTypes={onComplete:r.func};export{v as R,N as _};
//# sourceMappingURL=RentometerLoader-CoX2wXmr.js.map
