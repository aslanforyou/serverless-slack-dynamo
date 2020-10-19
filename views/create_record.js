module.exports = {
  type: 'modal',
  title: {
    type: 'plain_text',
    text: 'Create new record'
  },
  callback_id: '1988',
  submit: {
    type: 'plain_text',
    text: 'Create'
  },
  clear_on_close: true,
  blocks: [ // Block Kit
    {
      block_id: 'first_name',
      type: 'input',
      element: {
        action_id: 'first_name_value',
        type: 'plain_text_input',
        multiline: false,
        placeholder: {
          "type": "plain_text",
          "text": "John"
        }
      },
      label: {
        type: 'plain_text',
        text: 'First name'
      }
    },
    {
      block_id: 'last_name',
      type: 'input',
      element: {
        action_id: 'last_name_value',
        type: 'plain_text_input',
        multiline: false,
        placeholder: {
          "type": "plain_text",
          "text": "Doe"
        }
      },
      label: {
        type: 'plain_text',
        text: 'Last name'
      }
    }
  ]
};
