const request = require('supertest')
const app = require('../../src/app')
 
const MAIN_ROUTE = '/v1/transactions'
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTAwMDAsIm5hbWUiOiJVc2VyICMxIiwibWFpbCI6InVzZXIxQG1haWwuY29tIn0.QMgvo_lPe0Rdxpx7cay_hIkDAbjCK_--VD2fP0NTTqk'

beforeAll(async () => {
    await app.db.seed.run()
})

test('Deve listar apenas as transferências do usuario', () => {
    return request(app).get(MAIN_ROUTE)
    .set('authorization', `bearer ${TOKEN}`)
    .then((res) => {
        expect(res.status).toBe(200)
        expect(res.body).toHaveLength(1)
        expect(res.body[0].description).toBe('Transfer #1')
    })
});

test('Deve inserir uma transferência com sucesso', () => {
    return request(app).post(MAIN_ROUTE)
    .set('authorization', `bearer ${TOKEN}`)
    .send({
        description: 'Regular transfer',
        date: new Date(),
        ammount: 100,
        type: 'I',
        acc_id: 10000,
        transfer_id: 10001
    })
    .then(async (res) => {
        expect(res.status).toBe(201)
        expect(res.body.description).toBe('Regular transfer')

        const transactions = await app.db('transactions').where({ transfer_id: res.body.id })
        expect(transactions).toHaveLength(2)
        expect(transactions[0].description).toBe('Transfer to acc #10001')
        expect(transactions[1].description).toBe('Transfer from acc #10000')
        expect(transactions[0].ammount).toBe('-100.00')
        expect(transactions[1].ammount).toBe('100.00')
        expect(transactions[0].acc_id).toBe(10000)
        expect(transactions[1].acc_id).toBe(10001)
    })
});

describe('Ao salvar uma transferência válida...', () => {
    let transferId
    let income
    let outcome

    test('Deve retornar o status 201 e os dados da transferência', () => {
        return request(app).post(MAIN_ROUTE)
        .set('authorization', `bearer ${TOKEN}`)
        .send({
            description: 'Regular transfer',
            date: new Date(),
            ammount: 100,
            type: 'I',
            acc_id: 10000,
            transfer_id: 10001
        })
        .then(async (res) => {
            expect(res.status).toBe(201)
            expect(res.body.description).toBe('Regular transfer')
            transferId = res.body.id
        })
        })
    test('As transações equivalentes devem ter sido geradas', async () => {
        const transactions = await app.db('transactions').where({ transfer_id: transferId }).orderBy('ammount')
        expect(transactions).toHaveLength(2)
        [outcome, income] = transactions
    })

    test('A transação de saida deve ser negativa', async () => {
        expect(outcome.description).toBe('Transfer to acc #10001')
        expect(outcome.ammount).toBe('-100.00')
        expect(outcome.acc_id).toBe(10000)
        expect(outcome.type).toBe('O')
    })

    test('A transação de entrada deve ser positiva', async () => {
        expect(income.description).toBe('Transfer from acc #10000')
        expect(income.ammount).toBe('100.00')
        expect(income.acc_id).toBe(10001)
        expect(income.type).toBe('I')
    })

    test('Ambas devem referenciar a transferência que as originou', async () => {
        expect(income.transfer_id).toBe(transferId)
        expect(outcome.transfer_id).toBe(transferId)
    })
    
    
    test('Ambas devem estar com status de realizadas', async () => {
        expect(income.status).toBe(true)
        expect(outcome.status).toBe(true)
    })
})

describe('Ao tentar salvar uma transferência inválida...', () => {

    const validTransfer = {description: 'Regular transfer',
    date: new Date(),
    ammount: 100,
    type: 'I',
    acc_id: 10000,
    transfer_id: 10001}

    const template = (newData, errorMessage) => {
        return request(app).post(MAIN_ROUTE)
        .set('authorization', `bearer ${TOKEN}`)
        .send({...validTransfer, ...newData})
        .then((res) => {
            expect(res.status).toBe(400)
            expect(res.body.error).toBe(errorMessage)
        })
    }

    test('Não deve inserir sem descrição', async () => {
        await template({description: null}, 'Descrição é um atributo obrigatório')
    })
    test('Não deve inserir sem valor', async () => {
        await template({ammount: null}, 'Valor é um atributo obrigatório')
    })
    test('Não deve inserir sem data', () => {
        return template({date: null}, 'Data é um atributo obrigatório')
        })
    })
    test('Não deve inserir sem conta de origem', () => {
        return template({acc_id: null}, 'Conta de origem é um atributo obrigatório')
    })
    test('Não deve inserir sem conta de destino', () => {
        return template({transfer_id: null}, 'Conta de destino é um atributo obrigatório')
    })
    test('Não deve inserir se as contas de origem e destino forem as mesmas', () => {
        return template({transfer_id: 10000}, 'Não é possível transferir de uma conta para ela mesma')
    })
    test('Não deve inserir se as contas pertencerem a outro usuario', () => {
        return template({transfer_id: 10002}, 'Conta #10002 não pertence ao usuário')
    })

test('Deve retornar uma transferência por ID', () => {
    return request(app).get(`${MAIN_ROUTE}/10000`)
    .set('authorization', `bearer ${TOKEN}`)
    .then((res) => {
        expect(res.status).toBe(200)
        expect(res.body.description).toBe('Transfer #1')
    })
});

describe('Ao Alterar uma transferência válida...', () => {
    let transferId
    let income
    let outcome

    test('Deve retornar o status 200 e os dados da transferência', () => {
        return request(app).put(`${MAIN_ROUTE}/10000`)
        .set('authorization', `bearer ${TOKEN}`)
        .send({
            description: 'Transfer Updated',
            date: new Date(),
            ammount: 500,
            type: 'I',
            acc_id: 10000,
            transfer_id: 10001
        })
        .then(async (res) => {
            expect(res.status).toBe(200)
            expect(res.body.description).toBe('Transfer Updated')
            expect(res.body.ammount).toBe('500.00')
            transferId = res.body.id
        })
        })
    test('As transações equivalentes devem ter sido geradas', async () => {
        const transactions = await app.db('transactions').where({ transfer_id: transferId }).orderBy('ammount')
        expect(transactions).toHaveLength(2)
        [outcome, income] = transactions
    })

    test('A transação de saida deve ser negativa', async () => {
        expect(outcome.description).toBe('Transfer to acc #10001')
        expect(outcome.ammount).toBe('-500.00')
        expect(outcome.acc_id).toBe(10000)
        expect(outcome.type).toBe('O')
    })

    test('A transação de entrada deve ser positiva', async () => {
        expect(income.description).toBe('Transfer from acc #10000')
        expect(income.ammount).toBe('500.00')
        expect(income.acc_id).toBe(10001)
        expect(income.type).toBe('I')
    })

    test('Ambas devem referenciar a transferência que as originou', async () => {
        expect(income.transfer_id).toBe(transferId)
        expect(outcome.transfer_id).toBe(transferId)
    })
})

describe('Ao tentar Alterar uma transferência inválida...', () => {

    const validTransfer = {description: 'Regular transfer',
    date: new Date(),
    ammount: 100,
    type: 'I',
    acc_id: 10000,
    transfer_id: 10001}

    const template = (newData, errorMessage) => {
        return request(app).put(`${MAIN_ROUTE}/10000`)
        .set('authorization', `bearer ${TOKEN}`)
        .send({...validTransfer, ...newData})
        .then((res) => {
            expect(res.status).toBe(400)
            expect(res.body.error).toBe(errorMessage)
        })
    }

    test('Não deve inserir sem descrição', async () => {
        await template({description: null}, 'Descrição é um atributo obrigatório')
    })
    test('Não deve inserir sem valor', async () => {
        await template({ammount: null}, 'Valor é um atributo obrigatório')
    })
    test('Não deve inserir sem data', () => {
        return template({date: null}, 'Data é um atributo obrigatório')
        })
    })
    test('Não deve inserir sem conta de origem', () => {
        return template({acc_id: null}, 'Conta de origem é um atributo obrigatório')
    })
    test('Não deve inserir sem conta de destino', () => {
        return template({transfer_id: null}, 'Conta de destino é um atributo obrigatório')
    })
    test('Não deve inserir se as contas de origem e destino forem as mesmas', () => {
        return template({transfer_id: 10000}, 'Não é possível transferir de uma conta para ela mesma')
    })
    test('Não deve inserir se as contas pertencerem a outro usuario', () => {
        return template({transfer_id: 10002}, 'Conta #10002 não pertence ao usuário')
    })

    describe('Ao remover uma transferência...', () => {
        test('Deve retornar o status 204', () => {
            return request(app).delete(`${MAIN_ROUTE}/10000`)
            .set('authorization', `bearer ${TOKEN}`)
            .then((res) => {
                expect(res.status).toBe(204)
            })
        })

        test('O registro deve ser removido do banco', () => {
            return app.db('transfers').where({id: 10000})
            .then((result) => {
                expect(result).toHaveLength(0)
            })
        })
        
        test('As transações associadas devem ter sido removidas', () => {
            return app.db('transactions').where({transfer_id: 10000})
            .then((result) => {
                expect(result).toHaveLength(0)
            })
        })

    })

    test('Não deve retornar transferência de outro usuario', () => {
        return request(app).get(`${MAIN_ROUTE}/10001`)
        .set('authorization', `bearer ${TOKEN}`)
        .then((res) => {
            expect(res.status).toBe(403)
            expect(res.body.error).toBe('Este recurso não pertence ao usuário')
        })
    });

