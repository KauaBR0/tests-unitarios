const ValidationError = require('../errors/ValidationError')

module.exports = (app) => {
    const find = (userId, filter = {}) => {
        return app.db('transactions')
            .join('accounts', 'accounts.id', 'acc_id')
            .where(filter)
            .andWhere('accounts.user_id', '=', userId)
            .select()
    }

    const findOne = (filter) => {
        return app.db('transactions')
            .where(filter)
            .first()
    }

    const save = (transaction) => {
        if(!transaction.description) throw new Error('Descrição é um atributo obrigatório')
        if(!transaction.ammount) throw new Error('Valor é um atributo obrigatório')
        if(!transaction.date) throw new Error('Data é um atributo obrigatório')
        if(!transaction.acc_id) throw new Error('Conta é um atributo obrigatório')
        if(!transaction.type) throw new Error('Tipo é um atributo obrigatório')
        if(!(transaction.type === 'I' || transaction.type === 'O')) throw new Error('Tipo inválido')

        const newTransaction = { ...transaction }
        if((transaction.type === 'I' && transaction.ammount < 0)
            || (transaction.type === 'O' && transaction.ammount > 0)) {
                newTransaction.ammount *= -1
        }

        return app.db('transactions').insert(newTransaction, '*')
    }

    const update = (id, transaction) => {
        return app.db('transactions')
            .where({id})
            .update(transaction, '*')
    }

    const remove = (id) => {
        return app.db('transactions')
            .where({id})
            .del()
    }

    return { find, save, findOne, update, remove }
}
