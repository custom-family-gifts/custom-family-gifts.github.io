Drawer.init({
  title: (data) => {
    return `${data.records[0].name}${(!data.records[0].active) ? " (💤 inactive)" : ""}`;
  },
  apiCall: (params) => {
    if (!params._id) throw new Error('scheduled task Drawer needs _id');
    var call = {
      method: 'v2-mdb',
      body: JSON.stringify({
        op: 'find',
        db: 'cfg',
        col: 'scheduled_tasks',
        q: { _id: params._id }
      })
    };
    return call;
  },
  renderExtra: (data) => {
    console.log(data);
    return null;
  },
  renderOverview: (data) => {
    var task = data.records[0];
    // set up the modal edit function
    var modalFnId = Modal.getUniqueId();
    Modal.fns[modalFnId] = () => {
      Modal.renderEdit2({
        id: task._id,
        title: 'Edit Scheduled Task',
        fields: [
          { name: '_id', type: 'hidden', value: task._id },
          { name: 'name', type: 'textarea', value: task.name, required: true, instructions: 'to identify & describe the scheduled task' },
          { name: 'minutes', type: 'number', value: task.minutes, required: true, instructions: 'time between trigger' },
          { name: 'active', type: 'boolean', value: task.active, instructions: 'whether or not this scheduled task gets run' },
          { name: 'gcf_query_db', label: 'query mdb.db', type: 'text', value: task.gcf_query_db, instructions: 'leave all query fields blank to do a single run' },
          { name: 'gcf_query_col', label: 'query mdb.col', type: 'text', value: task.gcf_query_col },
          { name: 'gcf_query_q', label: 'query mdb.q', type: 'textarea', value: task.gcf_query_q, instructions: 'as json' },
          { name: 'gcf_query_p', label: 'query mdb.p', type: 'textarea', value: task.gcf_query_p, instructions: 'as json - passed by key to execute' },
          { name: 'gcf_query_per', label: 'query mdb.per', type: 'number', value: task.gcf_query_per },
          { name: 'gcf_execute', label: 'gcf execute', type: 'text', value: task.gcf_execute, required: true, instructions: 'gcf function to be invoked' },
          { name: 'gcf_params', label: 'gcf params', type: 'text', value: task.gcf_execute_params, instructions: 'start with ? use ||name|| to use value from query p' },
          { name: 'gcf_body', label: 'gcf body', type: 'textarea', value: task.gcf_execute_body, instructions: 'as json' },
        ],
        submitFn: async (formData) => {
          var _id = formData._id;
          delete formData._id; // one does not update the primary key
          var result = await API.gcf(`v2-mdb`, {
            body: JSON.stringify({
              op: 'updateVerify',
              db: 'cfg',
              col: 'scheduled_tasks',
              q: { _id: _id },
              doc: formData
            })
          });
          return result.records[0];
        },
        onSuccess: (result) => {
          Toast.show('Scheduled Task updated');
          Drawer.load({ _id: result._id });
        }
      });
    };

    var html = `<div class="row">Every ${data.records[0].minutes} minute(s)</div>`;
    html += `<div class="row">query: ${data.records[0].gcf_query_db}.${data.records[0].gcf_query_col}</div>`;
    html += `<div class="row">then run: ${data.records[0].gcf_execute}${data.records[0].gcf_execute_params}</div>`;
    html += `<button class="primary" onclick="Modal.fns[${modalFnId}]();">Edit</button>`;
    html += `<button class="secondary" onclick="deleteScheduledTask('${data.records[0]._id}');">Delete</button>`;
    return html;
    // return `
    //   <div class="row" style="position:absolute;top:6px;left:184px;">${renderPipeline(data.pipeline)} ${renderArtist(data.artist)}</div>
    //   <div style="white-space: nowrap; position: relative; height: 100%;">
    //     <div class="drawerDiv" style="width:calc(100% - 138px);display:inline-block">
    //       <div class="row">${renderItems(data.items, data.options)}</div>
    //       ${renderCustomer(data)}
    //     </div>
    //     <div class="drawerDiv" style="position: absolute; top: 0; right: 0; width: 140px;">
    //       ${renderLinks(data)}
    //     </div>
    //     ${renderProofs(data)}
    //   </div>
    // `
  },
  tabs: [
    {
      name: 'main',
      render: (data) => {
        var result = ``;
        return result;
      }
    }
  ]
});

async function deleteScheduledTask(taskId) {
  if (confirm('delete?')) {
    var result = await API.gcf(`v2-mdb`, {
      body: JSON.stringify({
        op: 'delete',
        db: 'cfg',
        col: 'scheduled_tasks',
        q: { _id: taskId }
      })
    });
    Drawer.hide();
    location.reload();
  }
}
