
const Workspace = use('App/Models/Workspace');
const {
  validateAll,
} = use('Validator');

const uuid = require('uuid/v4');

class WorkspaceController {
  // Create a new workspace for user
  async create({
    request,
    response,
    auth,
  }) {
    try {
      await auth.getUser();
    } catch (error) {
      return response.send('Missing or invalid api token');
    }

    // Validate user input
    const validation = await validateAll(request.all(), {
      name: 'required',
    });
    if (validation.fails()) {
      return response.status(401).send({
        message: 'Invalid POST arguments',
        messages: validation.messages(),
        status: 401,
      });
    }

    const data = request.all();

    // Get new, unused uuid
    let workspaceId;
    do {
      workspaceId = uuid();
    } while ((await Workspace.query().where('workspaceId', workspaceId).fetch()).rows.length > 0); // eslint-disable-line no-await-in-loop

    const order = (await auth.user.workspaces().fetch()).rows.length;

    await Workspace.create({
      userId: auth.user.id,
      workspaceId,
      name: data.name,
      order,
      services: JSON.stringify([]),
      data: JSON.stringify(data),
    });

    return response.send({
      userId: auth.user.id,
      name: data.name,
      id: workspaceId,
      order,
      workspaces: [],
    });
  }

  async edit({
    request,
    response,
    auth,
    params,
  }) {
    try {
      await auth.getUser();
    } catch (error) {
      return response.send('Missing or invalid api token');
    }

    // Validate user input
    const validation = await validateAll(request.all(), {
      name: 'required',
      services: 'required|array',
    });
    if (validation.fails()) {
      return response.status(401).send({
        message: 'Invalid POST arguments',
        messages: validation.messages(),
        status: 401,
      });
    }

    const data = request.all();
    const {
      id,
    } = params;

    // Update data in database
    await (Workspace.query()
      .where('workspaceId', id)
      .where('userId', auth.user.id)).update({
      name: data.name,
      services: JSON.stringify(data.services),
    });

    // Get updated row
    const workspace = (await Workspace.query()
      .where('workspaceId', id)
      .where('userId', auth.user.id).fetch()).rows[0];

    return response.send({
      id: workspace.workspaceId,
      name: data.name,
      order: workspace.order,
      services: data.services,
      userId: auth.user.id,
    });
  }

  async delete({
    // eslint-disable-next-line no-unused-vars
    _request,
    response,
    auth,
    params,
  }) {
    try {
      await auth.getUser();
    } catch (error) {
      return response.send('Missing or invalid api token');
    }

    // Validate user input
    const validation = await validateAll(params, {
      id: 'required',
    });
    if (validation.fails()) {
      return response.status(401).send({
        message: 'Invalid arguments',
        messages: validation.messages(),
        status: 401,
      });
    }

    const {
      id,
    } = params;

    // Update data in database
    await (Workspace.query()
      .where('workspaceId', id)
      .where('userId', auth.user.id)).delete();

    return response.send({
      message: 'Successfully deleted workspace',
    });
  }

  // List all workspaces a user has created
  async list({
    response,
    auth,
  }) {
    try {
      await auth.getUser();
    } catch (error) {
      return response.send('Missing or invalid api token');
    }

    const workspaces = (await auth.user.workspaces().fetch()).rows;
    // Convert to array with all data Franz wants
    let workspacesArray = [];
    if (workspaces) {
      workspacesArray = workspaces.map((workspace) => ({
        id: workspace.workspaceId,
        name: workspace.name,
        order: workspace.order,
        services: typeof workspace.services === 'string' ? JSON.parse(workspace.services) : workspace.services,
        userId: auth.user.id,
      }));
    }


    return response.send(workspacesArray);
  }
}

module.exports = WorkspaceController;
