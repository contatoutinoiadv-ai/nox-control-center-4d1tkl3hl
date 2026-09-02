/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('processos_monitorados')

    if (!col.fields.getByName('client_id')) {
      const clientsCol = app.findCollectionByNameOrId('clients')
      col.fields.add(
        new RelationField({
          name: 'client_id',
          collectionId: clientsCol.id,
          cascadeDelete: false,
          minSelect: 0,
          maxSelect: 1,
        }),
      )
      app.save(col)
    }

    // Index para acelerar a consulta de processos por cliente
    col.addIndex('idx_proc_mon_client', false, 'client_id', '')
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('processos_monitorados')
    col.removeIndex('idx_proc_mon_client')
    const field = col.fields.getByName('client_id')
    if (field) {
      col.fields.removeByName('client_id')
    }
    app.save(col)
  },
)
