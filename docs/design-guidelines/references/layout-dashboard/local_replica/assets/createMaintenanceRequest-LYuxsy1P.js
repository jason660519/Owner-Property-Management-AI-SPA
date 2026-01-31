const e=`mutation createMaintenanceRequest(
  $listing_id: String!
  $lease_id: String
  $title: String!
  $category: String!
  $description: String!
  $renter_id: String
  $contact_phone_number: String
  $preferred_time: MaintenanceRequestPreferredTime!
  $attachments: [MaintenanceRequestAttachmentInput]
  $is_emergency: Boolean
  $ai_assisted: Boolean
  $ai_conversation_id: String
) {
  createMaintenanceRequest(
    input: {
      attachments: $attachments
      listing_id: $listing_id
      lease_id: $lease_id
      title: $title
      category: $category
      description: $description
      preferred_time: $preferred_time
      renter_id: $renter_id
      contact_phone_number: $contact_phone_number
      is_emergency: $is_emergency
      ai_assisted: $ai_assisted
      ai_conversation_id: $ai_conversation_id
    }
  ) {
    maintenance_request {
      id
      title
      category
      description
      resolved_at
      created_at
      last_activity
      preferred_time
      lease {
        id
      }
      renter {
        id
        first_name
        last_name
      }
      maintenance_request_attachments {
        id
        url
        filename
        maintenance_request_activity_id
      }
      is_emergency
      ai_assisted
    }
  }
}
`,i={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"mutation",name:{kind:"Name",value:"createMaintenanceRequest"},variableDefinitions:[{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"listing_id"}},type:{kind:"NonNullType",type:{kind:"NamedType",name:{kind:"Name",value:"String"}}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"lease_id"}},type:{kind:"NamedType",name:{kind:"Name",value:"String"}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"title"}},type:{kind:"NonNullType",type:{kind:"NamedType",name:{kind:"Name",value:"String"}}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"category"}},type:{kind:"NonNullType",type:{kind:"NamedType",name:{kind:"Name",value:"String"}}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"description"}},type:{kind:"NonNullType",type:{kind:"NamedType",name:{kind:"Name",value:"String"}}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"renter_id"}},type:{kind:"NamedType",name:{kind:"Name",value:"String"}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"contact_phone_number"}},type:{kind:"NamedType",name:{kind:"Name",value:"String"}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"preferred_time"}},type:{kind:"NonNullType",type:{kind:"NamedType",name:{kind:"Name",value:"MaintenanceRequestPreferredTime"}}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"attachments"}},type:{kind:"ListType",type:{kind:"NamedType",name:{kind:"Name",value:"MaintenanceRequestAttachmentInput"}}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"is_emergency"}},type:{kind:"NamedType",name:{kind:"Name",value:"Boolean"}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"ai_assisted"}},type:{kind:"NamedType",name:{kind:"Name",value:"Boolean"}},directives:[]},{kind:"VariableDefinition",variable:{kind:"Variable",name:{kind:"Name",value:"ai_conversation_id"}},type:{kind:"NamedType",name:{kind:"Name",value:"String"}},directives:[]}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"createMaintenanceRequest"},arguments:[{kind:"Argument",name:{kind:"Name",value:"input"},value:{kind:"ObjectValue",fields:[{kind:"ObjectField",name:{kind:"Name",value:"attachments"},value:{kind:"Variable",name:{kind:"Name",value:"attachments"}}},{kind:"ObjectField",name:{kind:"Name",value:"listing_id"},value:{kind:"Variable",name:{kind:"Name",value:"listing_id"}}},{kind:"ObjectField",name:{kind:"Name",value:"lease_id"},value:{kind:"Variable",name:{kind:"Name",value:"lease_id"}}},{kind:"ObjectField",name:{kind:"Name",value:"title"},value:{kind:"Variable",name:{kind:"Name",value:"title"}}},{kind:"ObjectField",name:{kind:"Name",value:"category"},value:{kind:"Variable",name:{kind:"Name",value:"category"}}},{kind:"ObjectField",name:{kind:"Name",value:"description"},value:{kind:"Variable",name:{kind:"Name",value:"description"}}},{kind:"ObjectField",name:{kind:"Name",value:"preferred_time"},value:{kind:"Variable",name:{kind:"Name",value:"preferred_time"}}},{kind:"ObjectField",name:{kind:"Name",value:"renter_id"},value:{kind:"Variable",name:{kind:"Name",value:"renter_id"}}},{kind:"ObjectField",name:{kind:"Name",value:"contact_phone_number"},value:{kind:"Variable",name:{kind:"Name",value:"contact_phone_number"}}},{kind:"ObjectField",name:{kind:"Name",value:"is_emergency"},value:{kind:"Variable",name:{kind:"Name",value:"is_emergency"}}},{kind:"ObjectField",name:{kind:"Name",value:"ai_assisted"},value:{kind:"Variable",name:{kind:"Name",value:"ai_assisted"}}},{kind:"ObjectField",name:{kind:"Name",value:"ai_conversation_id"},value:{kind:"Variable",name:{kind:"Name",value:"ai_conversation_id"}}}]}}],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"maintenance_request"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"title"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"category"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"description"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"resolved_at"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"created_at"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"last_activity"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"preferred_time"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"lease"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]}]}},{kind:"Field",name:{kind:"Name",value:"renter"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"first_name"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"last_name"},arguments:[],directives:[]}]}},{kind:"Field",name:{kind:"Name",value:"maintenance_request_attachments"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"url"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"filename"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"maintenance_request_activity_id"},arguments:[],directives:[]}]}},{kind:"Field",name:{kind:"Name",value:"is_emergency"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"ai_assisted"},arguments:[],directives:[]}]}}]}}]}}],loc:{start:0,end:1303,source:{name:"GraphQL request",locationOffset:{line:1,column:1},body:e}}};export{i as _};
//# sourceMappingURL=createMaintenanceRequest-LYuxsy1P.js.map
