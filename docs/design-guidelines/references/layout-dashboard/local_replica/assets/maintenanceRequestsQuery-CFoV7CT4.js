const e=`query maintenanceRequestsQuery {
  userData {
    id
    maintenance_requests {
      data {
        id
        title
        description
        renter {
          id
          email
          first_name
          last_name
        }
        listing {
          id
          address
          unit
          room_name
          nickname
          property_role
          has_active_tenant_placement_service
          has_active_property_management_service
        }
        created_at
        resolved_at
        preferred_time
        starred
        status
        last_activity
        requester {
          id
          user_role
          first_name
          last_name
        }
        sent_to_partner
        ai_assisted
        partner_work_order {
          pending_quotes {
            uri
            expiresAt
          }
        }
      }
    }
  }
}
`,i={kind:"Document",definitions:[{kind:"OperationDefinition",operation:"query",name:{kind:"Name",value:"maintenanceRequestsQuery"},variableDefinitions:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"userData"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"maintenance_requests"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"data"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"title"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"description"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"renter"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"email"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"first_name"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"last_name"},arguments:[],directives:[]}]}},{kind:"Field",name:{kind:"Name",value:"listing"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"address"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"unit"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"room_name"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"nickname"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"property_role"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"has_active_tenant_placement_service"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"has_active_property_management_service"},arguments:[],directives:[]}]}},{kind:"Field",name:{kind:"Name",value:"created_at"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"resolved_at"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"preferred_time"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"starred"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"status"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"last_activity"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"requester"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"id"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"user_role"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"first_name"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"last_name"},arguments:[],directives:[]}]}},{kind:"Field",name:{kind:"Name",value:"sent_to_partner"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"ai_assisted"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"partner_work_order"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"pending_quotes"},arguments:[],directives:[],selectionSet:{kind:"SelectionSet",selections:[{kind:"Field",name:{kind:"Name",value:"uri"},arguments:[],directives:[]},{kind:"Field",name:{kind:"Name",value:"expiresAt"},arguments:[],directives:[]}]}}]}}]}}]}}]}}]}}],loc:{start:0,end:904,source:{name:"GraphQL request",locationOffset:{line:1,column:1},body:e}}};export{i as _};
//# sourceMappingURL=maintenanceRequestsQuery-CFoV7CT4.js.map
